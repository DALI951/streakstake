import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * Cloud Function Cron Job: checkExpiredChallenges
 * Runs every 15 minutes to automatically check for active challenges that have passed
 * their deadline, automatically deducts XP from users who failed, and resets their streak counter to zero.
 */
export const checkExpiredChallenges = functions.pubsub
  .schedule('every 15 minutes')
  .onRun(async (context) => {
    const nowIso = new Date().toISOString();
    console.log(`Running deadline sweep at ${nowIso}...`);

    const expiredQuery = await db
      .collection('challenges')
      .where('status', 'in', ['active', 'pending_verification'])
      .where('deadline', '<=', nowIso)
      .get();

    if (expiredQuery.empty) {
      console.log('No expired challenges found.');
      return null;
    }

    const batch = db.batch();

    for (const doc of expiredQuery.docs) {
      const challenge = doc.data();
      const challengeId = doc.id;
      const creatorId = challenge.creatorId;
      const stakeXp = challenge.stakeXp || 0;

      console.log(`Burning challenge ${challengeId} for user ${creatorId} (${stakeXp} XP)`);

      // 1. Mark challenge as failed
      batch.update(doc.ref, {
        status: 'failed',
        burnedAt: nowIso,
        failureReason: 'Deadline lapsed without peer verification'
      });

      // 2. Deduct locked stake & reset streak in user profile
      const userRef = db.collection('users').doc(creatorId);
      batch.update(userRef, {
        stakedXp: admin.firestore.FieldValue.increment(-stakeXp),
        currentStreak: 0,
        challengesFailed: admin.firestore.FieldValue.increment(1)
      });

      // 3. Post burn event to public social feed
      const feedRef = db.collection('feed').doc();
      batch.set(feedRef, {
        type: 'xp_burned',
        userId: creatorId,
        userName: challenge.creatorName,
        userAvatar: challenge.creatorAvatar,
        challengeId,
        challengeTitle: challenge.title,
        burnedXp: stakeXp,
        streakCount: 0,
        message: `💀 Deadline passed on "${challenge.title}". ${stakeXp} XP was burned and streak reset to 0!`,
        timestamp: nowIso,
        likes: []
      });

      // 4. Send notification
      const notifRef = db.collection('notifications').doc();
      batch.set(notifRef, {
        userId: creatorId,
        title: 'Stake Burned: Deadline Missed',
        body: `Your deadline for "${challenge.title}" passed. ${stakeXp} XP was incinerated and streak reset to 0.`,
        type: 'stake_burned',
        read: false,
        timestamp: nowIso,
        challengeId
      });
    }

    await batch.commit();
    console.log(`Successfully burned ${expiredQuery.size} expired challenges.`);
    return null;
  });

/**
 * Realtime Trigger: onChallengeVerified
 * Fires when a friend approves/verifies a challenge proof.
 * Awards creator payout + multiplier bonus, updates streak, and awards arbiter bounty to the verifier.
 */
export const onChallengeVerified = functions.firestore
  .document('challenges/{challengeId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    if (before.status !== 'completed' && after.status === 'completed') {
      const { creatorId, stakeXp, bonusMultiplier = 1.0, title } = after;
      const verifierId = after.proof?.verifiedByUserId;
      const earnedBonus = Math.round(stakeXp * bonusMultiplier);
      const totalPayout = stakeXp + earnedBonus;

      const batch = db.batch();

      // Return stake + award multiplier bonus to creator
      const creatorRef = db.collection('users').doc(creatorId);
      batch.update(creatorRef, {
        totalXp: admin.firestore.FieldValue.increment(totalPayout),
        stakedXp: admin.firestore.FieldValue.increment(-stakeXp),
        weeklyXp: admin.firestore.FieldValue.increment(earnedBonus),
        currentStreak: admin.firestore.FieldValue.increment(1),
        challengesCompleted: admin.firestore.FieldValue.increment(1)
      });

      // Reward verifier with Arbiter bounty (+25 XP)
      if (verifierId) {
        const verifierRef = db.collection('users').doc(verifierId);
        batch.update(verifierRef, {
          totalXp: admin.firestore.FieldValue.increment(25),
          proofsVerifiedCount: admin.firestore.FieldValue.increment(1)
        });
      }

      await batch.commit();
      console.log(`Payout completed for ${title}: +${earnedBonus} XP bonus awarded to ${creatorId}`);
    }
  });
