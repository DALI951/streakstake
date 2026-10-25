import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Challenge, ChallengeCategory, FeedItem, NotificationItem, ProofSubmission } from '../types/challenge';
import { audio } from '../services/audioService';
import { useAuth } from './AuthContext';
import { 
  db, 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from '../services/firebase';

interface CreateChallengeInput {
  title: string;
  description: string;
  category: ChallengeCategory;
  stakeXp: number;
  deadlineHours: number;
  proofType: 'photo' | 'checklist' | 'pedometer' | 'mixed';
  walkTargetMeters?: number;
  isGroupChallenge: boolean;
  participantIds: string[];
}

interface ChallengeContextType {
  challenges: Challenge[];
  feed: FeedItem[];
  notifications: NotificationItem[];
  createChallenge: (input: CreateChallengeInput) => boolean;
  deleteChallenge: (challengeId: string) => void;
  submitProof: (challengeId: string, notes: string, imageUrl?: string, telemetry?: ProofSubmission['telemetryData']) => void;
  verifyChallenge: (challengeId: string) => void;
  rejectChallenge: (challengeId: string, reason: string) => void;
  burnChallengeManually: (challengeId: string) => void;
  likeFeedItem: (feedId: string) => void;
  markNotificationAsRead: (notificationId: string) => void;
  clearAllNotifications: () => void;
  unreadNotificationCount: number;
  calculateMultiplier: (streak: number) => number;
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

const LOCAL_STORAGE_CHALLENGES = 'streakstake_challenges_clean_v2';
const LOCAL_STORAGE_FEED = 'streakstake_feed_clean_v2';
const LOCAL_STORAGE_NOTIFS = 'streakstake_notifs_clean_v2';

export const ChallengeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, updateUserXp, updateUserStreak, users } = useAuth();
  
  const [challenges, setChallenges] = useState<Challenge[]>(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_CHALLENGES);
    return raw ? JSON.parse(raw) : [];
  });
  
  const [feed, setFeed] = useState<FeedItem[]>(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_FEED);
    return raw ? JSON.parse(raw) : [];
  });
  
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTIFS);
    return raw ? JSON.parse(raw) : [];
  });

  // Sync to local storage for offline support
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_CHALLENGES, JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_FEED, JSON.stringify(feed));
  }, [feed]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_NOTIFS, JSON.stringify(notifications));
  }, [notifications]);

  // Real-time Firestore Live Sync for Challenges
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'challenges'), (snapshot) => {
        const remoteChallenges: Challenge[] = [];
        snapshot.forEach((d) => {
          remoteChallenges.push(d.data() as Challenge);
        });
        if (remoteChallenges.length > 0) {
          setChallenges(remoteChallenges);
        }
      }, (err) => {
        console.warn('Firestore challenges snapshot notice:', err.message);
      });
      return () => unsub();
    } catch {}
  }, []);

  // Real-time Firestore Live Sync for Feed
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'feed'), (snapshot) => {
        const remoteFeed: FeedItem[] = [];
        snapshot.forEach((d) => {
          remoteFeed.push(d.data() as FeedItem);
        });
        if (remoteFeed.length > 0) {
          // Sort by timestamp descending
          remoteFeed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setFeed(remoteFeed);
        }
      }, (err) => {
        console.warn('Firestore feed snapshot notice:', err.message);
      });
      return () => unsub();
    } catch {}
  }, []);

  const calculateMultiplier = useCallback((streak: number): number => {
    if (streak >= 5) return 2.0;
    if (streak >= 2) return 1.5;
    return 1.0;
  }, []);

  // Automated Deadline Sweeper
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();

      setChallenges((prev) => {
        let hasChanges = false;
        const updated = prev.map((c) => {
          if ((c.status === 'active' || c.status === 'pending_verification') && new Date(c.deadline).getTime() < now) {
            hasChanges = true;
            updateUserXp(c.creatorId, 0, -c.stakeXp);
            updateUserStreak(c.creatorId, false);
            audio.playBurn();

            const burnFeedItem: FeedItem = {
              id: 'burn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              type: 'xp_burned',
              userId: c.creatorId,
              userName: c.creatorName,
              userAvatar: c.creatorAvatar,
              challengeId: c.id,
              challengeTitle: c.title,
              burnedXp: c.stakeXp,
              streakCount: 0,
              message: `💀 Deadline passed on "${c.title}". ${c.stakeXp} XP burned & streak reset to 0!`,
              timestamp: new Date().toISOString(),
              likes: []
            };

            setFeed((f) => [burnFeedItem, ...f]);
            try {
              setDoc(doc(db, 'feed', burnFeedItem.id), burnFeedItem);
            } catch {}

            return { ...c, status: 'failed' as const };
          }
          return c;
        });

        return hasChanges ? updated : prev;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [updateUserXp, updateUserStreak]);

  // Create Challenge & Lock XP Stake
  const createChallenge = (input: CreateChallengeInput): boolean => {
    if (!currentUser) return false;
    if (currentUser.totalXp < input.stakeXp) {
      alert(`Insufficient XP! You have ${currentUser.totalXp} XP, but need ${input.stakeXp} XP.`);
      return false;
    }

    const multiplier = calculateMultiplier(currentUser.currentStreak);
    const deadlineDate = new Date(Date.now() + input.deadlineHours * 3600 * 1000).toISOString();

    const newChallenge: Challenge = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      creatorAvatar: currentUser.avatar,
      title: input.title,
      description: input.description,
      category: input.category,
      stakeXp: input.stakeXp,
      bonusMultiplier: multiplier,
      deadline: deadlineDate,
      createdAt: new Date().toISOString(),
      status: 'active',
      proofType: input.proofType,
      walkTargetMeters: input.walkTargetMeters,
      isGroupChallenge: input.isGroupChallenge,
      participantIds: input.isGroupChallenge ? [currentUser.id, ...input.participantIds] : [currentUser.id],
      tags: [input.category.toUpperCase()]
    };

    updateUserXp(currentUser.id, -input.stakeXp, input.stakeXp);
    setChallenges((prev) => [newChallenge, ...prev]);

    // Firestore sync
    try {
      setDoc(doc(db, 'challenges', newChallenge.id), newChallenge);
    } catch {}

    const feedItem: FeedItem = {
      id: 'feed_stake_' + Date.now(),
      type: 'challenge_staked',
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      challengeId: newChallenge.id,
      challengeTitle: newChallenge.title,
      stakeXp: newChallenge.stakeXp,
      message: `Locked in ${newChallenge.stakeXp} XP on "${newChallenge.title}" with a ${multiplier}x payout potential!`,
      timestamp: new Date().toISOString(),
      likes: []
    };

    setFeed((prev) => [feedItem, ...prev]);
    try {
      setDoc(doc(db, 'feed', feedItem.id), feedItem);
    } catch {}

    audio.playStakeLock();
    return true;
  };

  const deleteChallenge = (challengeId: string) => {
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return;

    if (target.status === 'active' || target.status === 'pending_verification') {
      updateUserXp(target.creatorId, target.stakeXp, -target.stakeXp);
    }

    setChallenges((prev) => prev.filter((c) => c.id !== challengeId));
    try {
      deleteDoc(doc(db, 'challenges', challengeId));
    } catch {}
    audio.playClick();
  };

  // Submit Proof for Peer Review (Supports Walking Telemetry or Photos)
  const submitProof = (
    challengeId: string, 
    notes: string, 
    imageUrl?: string,
    telemetry?: ProofSubmission['telemetryData']
  ) => {
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return;

    const proof: ProofSubmission = {
      id: 'proof_' + Date.now(),
      submittedAt: new Date().toISOString(),
      notes,
      imageUrl: imageUrl || (target.category === 'walking' 
        ? 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&auto=format&fit=crop&q=80'),
      telemetryData: telemetry
    };

    const updatedChallenge: Challenge = {
      ...target,
      status: 'pending_verification',
      proof
    };

    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? updatedChallenge : c))
    );

    try {
      setDoc(doc(db, 'challenges', challengeId), updatedChallenge);
    } catch {}

    const feedItem: FeedItem = {
      id: 'feed_proof_' + Date.now(),
      type: 'proof_submitted',
      userId: target.creatorId,
      userName: target.creatorName,
      userAvatar: target.creatorAvatar,
      challengeId: target.id,
      challengeTitle: target.title,
      stakeXp: target.stakeXp,
      proofImageUrl: proof.imageUrl,
      telemetryNote: notes,
      message: `Completed "${target.title}" and submitted proof for peer verification!`,
      timestamp: new Date().toISOString(),
      likes: []
    };

    setFeed((prev) => [feedItem, ...prev]);
    try {
      setDoc(doc(db, 'feed', feedItem.id), feedItem);
    } catch {}

    audio.playClick();
  };

  // Peer Verification Flow
  const verifyChallenge = (challengeId: string) => {
    if (!currentUser) return;
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return;

    if (target.creatorId === currentUser.id) {
      alert("Anti-Cheat Rule: A friend or peer must verify your proof to release your stake!");
      return;
    }

    const earnedBonus = Math.round(target.stakeXp * target.bonusMultiplier);
    const totalReturned = target.stakeXp + earnedBonus;

    updateUserXp(target.creatorId, totalReturned, -target.stakeXp);
    updateUserStreak(target.creatorId, true);
    updateUserXp(currentUser.id, 25, 0); // Arbiter Bounty (+25 XP)

    const updatedChallenge: Challenge = {
      ...target,
      status: 'completed',
      proof: target.proof
        ? {
            ...target.proof,
            verifiedByUserId: currentUser.id,
            verifiedByUserName: currentUser.name,
            verifiedAt: new Date().toISOString()
          }
        : undefined
    };

    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? updatedChallenge : c))
    );

    try {
      setDoc(doc(db, 'challenges', challengeId), updatedChallenge);
    } catch {}

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });

    if (target.bonusMultiplier > 1.0) {
      audio.playStreakBonus();
    } else {
      audio.playSuccess();
    }

    const feedItem: FeedItem = {
      id: 'feed_verified_' + Date.now(),
      type: 'challenge_verified',
      userId: target.creatorId,
      userName: target.creatorName,
      userAvatar: target.creatorAvatar,
      verifierName: currentUser.name,
      challengeId: target.id,
      challengeTitle: target.title,
      earnedXp: earnedBonus,
      message: `Verified! ${currentUser.name} approved ${target.creatorName}'s proof for "${target.title}". Stake returned + ${earnedBonus} XP bonus earned!`,
      timestamp: new Date().toISOString(),
      likes: [currentUser.id]
    };

    setFeed((prev) => [feedItem, ...prev]);
    try {
      setDoc(doc(db, 'feed', feedItem.id), feedItem);
    } catch {}
  };

  const rejectChallenge = (challengeId: string, reason: string) => {
    if (!currentUser) return;
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return;

    if (target.creatorId === currentUser.id) {
      alert("You cannot reject your own proof.");
      return;
    }

    updateUserXp(target.creatorId, 0, -target.stakeXp);
    updateUserStreak(target.creatorId, false);

    const updatedChallenge: Challenge = {
      ...target,
      status: 'rejected',
      proof: target.proof
        ? {
            ...target.proof,
            rejectionReason: reason,
            verifiedByUserId: currentUser.id,
            verifiedByUserName: currentUser.name,
            verifiedAt: new Date().toISOString()
          }
        : undefined
    };

    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? updatedChallenge : c))
    );

    try {
      setDoc(doc(db, 'challenges', challengeId), updatedChallenge);
    } catch {}

    audio.playBurn();

    const feedItem: FeedItem = {
      id: 'feed_rejected_' + Date.now(),
      type: 'xp_burned',
      userId: target.creatorId,
      userName: target.creatorName,
      userAvatar: target.creatorAvatar,
      verifierName: currentUser.name,
      challengeId: target.id,
      challengeTitle: target.title,
      burnedXp: target.stakeXp,
      message: `🚫 Proof Rejected! ${currentUser.name} rejected ${target.creatorName}'s proof for "${target.title}" ("${reason}"). ${target.stakeXp} XP burned!`,
      timestamp: new Date().toISOString(),
      likes: []
    };

    setFeed((prev) => [feedItem, ...prev]);
    try {
      setDoc(doc(db, 'feed', feedItem.id), feedItem);
    } catch {}
  };

  const burnChallengeManually = (challengeId: string) => {
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return;

    updateUserXp(target.creatorId, 0, -target.stakeXp);
    updateUserStreak(target.creatorId, false);

    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? { ...c, status: 'failed' } : c))
    );

    try {
      setDoc(doc(db, 'challenges', challengeId), { status: 'failed' }, { merge: true });
    } catch {}

    audio.playBurn();
  };

  const likeFeedItem = (feedId: string) => {
    if (!currentUser) return;
    setFeed((prev) =>
      prev.map((item) => {
        if (item.id !== feedId) return item;
        const alreadyLiked = item.likes.includes(currentUser.id);
        const newLikes = alreadyLiked
          ? item.likes.filter((id) => id !== currentUser.id)
          : [...item.likes, currentUser.id];
        const updated = { ...item, likes: newLikes };
        try {
          setDoc(doc(db, 'feed', feedId), updated, { merge: true });
        } catch {}
        return updated;
      })
    );
    audio.playClick();
  };

  const markNotificationAsRead = (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadNotificationCount = notifications.filter(
    (n) => n.userId === currentUser?.id && !n.read
  ).length;

  return (
    <ChallengeContext.Provider
      value={{
        challenges,
        feed,
        notifications,
        createChallenge,
        deleteChallenge,
        submitProof,
        verifyChallenge,
        rejectChallenge,
        burnChallengeManually,
        likeFeedItem,
        markNotificationAsRead,
        clearAllNotifications,
        unreadNotificationCount,
        calculateMultiplier
      }}
    >
      {children}
    </ChallengeContext.Provider>
  );
};

export const useChallenges = () => {
  const context = useContext(ChallengeContext);
  if (!context) {
    throw new Error('useChallenges must be used within a ChallengeProvider');
  }
  return context;
};
