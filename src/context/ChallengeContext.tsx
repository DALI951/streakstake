import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Challenge, ChallengeCategory, FeedItem, NotificationItem, ProofSubmission } from '../types/challenge';
import { StorageService } from '../services/storageService';
import { audio } from '../services/audioService';
import { useAuth } from './AuthContext';

interface CreateChallengeInput {
  title: string;
  description: string;
  category: ChallengeCategory;
  stakeXp: number;
  deadlineHours: number;
  proofType: 'photo' | 'checklist' | 'mixed';
  isGroupChallenge: boolean;
  participantIds: string[];
}

interface ChallengeContextType {
  challenges: Challenge[];
  feed: FeedItem[];
  notifications: NotificationItem[];
  createChallenge: (input: CreateChallengeInput) => boolean;
  deleteChallenge: (challengeId: string) => void;
  submitProof: (challengeId: string, notes: string, imageUrl?: string) => void;
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

export const ChallengeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, updateUserXp, updateUserStreak, users } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>(() => StorageService.getChallenges());
  const [feed, setFeed] = useState<FeedItem[]>(() => StorageService.getFeed());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => StorageService.getNotifications());

  // Save to localStorage when state changes
  useEffect(() => {
    StorageService.saveChallenges(challenges);
  }, [challenges]);

  useEffect(() => {
    StorageService.saveFeed(feed);
  }, [feed]);

  useEffect(() => {
    StorageService.saveNotifications(notifications);
  }, [notifications]);

  // Streak Multiplier Formula:
  // 0-2 streak: 1.0x
  // 3-4 streak: 1.5x (Triggered by 3-streak rule!)
  // 5+ streak: 2.0x (Elite streak multiplier)
  const calculateMultiplier = useCallback((streak: number): number => {
    if (streak >= 5) return 2.0;
    if (streak >= 2) return 1.5; // Next completion will be 3rd or 4th!
    return 1.0;
  }, []);

  // Request browser push notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const sendBrowserNotification = (title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.svg' });
      } catch {
        // Ignored in unsupported browsers
      }
    }
  };

  // Automated Deadline & Punishment Engine (Simulates Cloud Function Cron)
  // Runs every 4 seconds to sweep for expired deadlines
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();

      setChallenges((prevChallenges) => {
        let hasChanges = false;
        const updated = prevChallenges.map((challenge) => {
          if ((challenge.status === 'active' || challenge.status === 'pending_verification') && new Date(challenge.deadline).getTime() < now) {
            hasChanges = true;
            // Challenge deadline passed without verification!
            // Burn the stake, reset streak!
            updateUserXp(challenge.creatorId, 0, -challenge.stakeXp);
            updateUserStreak(challenge.creatorId, false);

            audio.playBurn();

            // Broadcast burn event to social feed
            const burnFeedItem: FeedItem = {
              id: 'burn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              type: 'xp_burned',
              userId: challenge.creatorId,
              userName: challenge.creatorName,
              userAvatar: challenge.creatorAvatar,
              challengeId: challenge.id,
              challengeTitle: challenge.title,
              burnedXp: challenge.stakeXp,
              streakCount: 0,
              message: `💀 Deadline passed on "${challenge.title}". ${challenge.stakeXp} XP burned & streak reset to 0!`,
              timestamp: new Date().toISOString(),
              likes: []
            };

            setFeed((f) => [burnFeedItem, ...f]);

            // Add notification
            const notif: NotificationItem = {
              id: 'notif_burn_' + Date.now(),
              userId: challenge.creatorId,
              title: 'Stake Burned: Deadline Missed',
              body: `Your deadline for "${challenge.title}" lapsed. ${challenge.stakeXp} XP was incinerated and your streak was reset to 0.`,
              type: 'stake_burned',
              read: false,
              timestamp: new Date().toISOString(),
              challengeId: challenge.id
            };
            setNotifications((n) => [notif, ...n]);
            sendBrowserNotification('Streak Burned! 🔥💀', `Your stake of ${challenge.stakeXp} XP was lost on "${challenge.title}".`);

            return {
              ...challenge,
              status: 'failed' as const
            };
          }
          return challenge;
        });

        return hasChanges ? updated : prevChallenges;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [updateUserXp, updateUserStreak]);

  // Create Challenge & Lock XP Stake
  const createChallenge = (input: CreateChallengeInput): boolean => {
    if (currentUser.totalXp < input.stakeXp) {
      alert(`Insufficient XP! You have ${currentUser.totalXp} XP available, but need ${input.stakeXp} XP to lock this stake.`);
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
      isGroupChallenge: input.isGroupChallenge,
      participantIds: input.isGroupChallenge ? [currentUser.id, ...input.participantIds] : [currentUser.id],
      tags: [input.category.toUpperCase()]
    };

    // Lock stake: subtract from available XP, put into stakedXp
    updateUserXp(currentUser.id, -input.stakeXp, input.stakeXp);

    setChallenges((prev) => [newChallenge, ...prev]);

    // Feed event
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

    audio.playStakeLock();
    return true;
  };

  const deleteChallenge = (challengeId: string) => {
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return;

    // Refund locked stake if challenge is still active
    if (target.status === 'active' || target.status === 'pending_verification') {
      updateUserXp(target.creatorId, target.stakeXp, -target.stakeXp);
    }

    setChallenges((prev) => prev.filter((c) => c.id !== challengeId));
    audio.playClick();
  };

  // Submit Proof for Peer Review
  const submitProof = (challengeId: string, notes: string, imageUrl?: string) => {
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return;

    const proof: ProofSubmission = {
      id: 'proof_' + Date.now(),
      submittedAt: new Date().toISOString(),
      notes,
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&auto=format&fit=crop&q=80'
    };

    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? { ...c, status: 'pending_verification', proof } : c))
    );

    // Broadcast proof submission to feed
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
      message: `Completed "${target.title}" and submitted proof for peer verification! Tap to verify.`,
      timestamp: new Date().toISOString(),
      likes: []
    };
    setFeed((prev) => [feedItem, ...prev]);

    // Send notifications to friends / participants
    const friendsToNotify = users.filter((u) => u.id !== target.creatorId);
    const newNotifs: NotificationItem[] = friendsToNotify.map((f) => ({
      id: 'notif_verify_' + Date.now() + '_' + f.id,
      userId: f.id,
      title: 'Peer Proof Waiting for Review',
      body: `${target.creatorName} completed "${target.title}". Review their proof to release their stake!`,
      type: 'verification_request',
      read: false,
      timestamp: new Date().toISOString(),
      challengeId: target.id
    }));
    setNotifications((prev) => [...newNotifs, ...prev]);

    audio.playClick();
  };

  // Peer Verification Flow (Friend Taps "Verify")
  const verifyChallenge = (challengeId: string) => {
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return;

    // Prevent creator from verifying their own challenge (Anti-Cheat Peer Rule!)
    if (target.creatorId === currentUser.id) {
      alert("Anti-Cheat Rule: You cannot verify your own challenge! A friend or accountability partner must verify your proof.");
      return;
    }

    // Calculate payouts
    // Payout = Staked XP returned + (Staked XP * bonusMultiplier)
    const earnedBonus = Math.round(target.stakeXp * target.bonusMultiplier);
    const totalReturned = target.stakeXp + earnedBonus;

    // Release creator's stake and award total XP
    updateUserXp(target.creatorId, totalReturned, -target.stakeXp);
    updateUserStreak(target.creatorId, true);

    // Reward verifying friend with Arbiter Bounty (+25 XP)
    updateUserXp(currentUser.id, 25, 0);

    // Update challenge
    setChallenges((prev) =>
      prev.map((c) => {
        if (c.id === challengeId) {
          return {
            ...c,
            status: 'completed',
            proof: c.proof
              ? {
                  ...c.proof,
                  verifiedByUserId: currentUser.id,
                  verifiedByUserName: currentUser.name,
                  verifiedAt: new Date().toISOString()
                }
              : undefined
          };
        }
        return c;
      })
    );

    // Confetti celebration
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

    // Broadcast feed event
    const creatorUser = users.find((u) => u.id === target.creatorId);
    const newStreak = (creatorUser?.currentStreak || 0) + 1;

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
      streakCount: newStreak,
      message: `Verified! ${currentUser.name} approved ${target.creatorName}'s proof for "${target.title}". Stake returned + ${earnedBonus} XP bonus earned! 🔥 Current streak: ${newStreak}`,
      timestamp: new Date().toISOString(),
      likes: [currentUser.id]
    };
    setFeed((prev) => [feedItem, ...prev]);

    // If milestone reached (3-streak)
    if (newStreak === 3 || newStreak === 5 || newStreak === 10) {
      const milestoneItem: FeedItem = {
        id: 'feed_milestone_' + Date.now(),
        type: 'streak_milestone',
        userId: target.creatorId,
        userName: target.creatorName,
        userAvatar: target.creatorAvatar,
        streakCount: newStreak,
        message: `🔥 STREAK MILESTONE! ${target.creatorName} hit an unbroken ${newStreak}-challenge streak!`,
        timestamp: new Date().toISOString(),
        likes: [currentUser.id]
      };
      setFeed((prev) => [milestoneItem, ...prev]);
    }

    // Send notification to creator
    const notif: NotificationItem = {
      id: 'notif_win_' + Date.now(),
      userId: target.creatorId,
      title: 'Proof Verified! 🎉',
      body: `${currentUser.name} verified your proof for "${target.title}". You earned +${earnedBonus} XP bonus!`,
      type: 'challenge_won',
      read: false,
      timestamp: new Date().toISOString(),
      challengeId: target.id
    };
    setNotifications((prev) => [notif, ...prev]);
    sendBrowserNotification('Proof Verified! 🎉', `${currentUser.name} verified your challenge proof!`);
  };

  // Peer Rejection Flow (Friend flags invalid proof)
  const rejectChallenge = (challengeId: string, reason: string) => {
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return;

    if (target.creatorId === currentUser.id) {
      alert("You cannot reject your own proof.");
      return;
    }

    // Burn creator's stake and reset streak
    updateUserXp(target.creatorId, 0, -target.stakeXp);
    updateUserStreak(target.creatorId, false);

    setChallenges((prev) =>
      prev.map((c) => {
        if (c.id === challengeId) {
          return {
            ...c,
            status: 'rejected',
            proof: c.proof
              ? {
                  ...c.proof,
                  rejectionReason: reason,
                  verifiedByUserId: currentUser.id,
                  verifiedByUserName: currentUser.name,
                  verifiedAt: new Date().toISOString()
                }
              : undefined
          };
        }
        return c;
      })
    );

    audio.playBurn();

    // Broadcast feed event
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

    // Send notification
    const notif: NotificationItem = {
      id: 'notif_reject_' + Date.now(),
      userId: target.creatorId,
      title: 'Proof Rejected & Stake Burned',
      body: `${currentUser.name} flagged your proof: "${reason}". Your stake was burned and streak reset.`,
      type: 'stake_burned',
      read: false,
      timestamp: new Date().toISOString(),
      challengeId: target.id
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Manual burn (e.g. user admits defeat before deadline)
  const burnChallengeManually = (challengeId: string) => {
    const target = challenges.find((c) => c.id === challengeId);
    if (!target) return;

    updateUserXp(target.creatorId, 0, -target.stakeXp);
    updateUserStreak(target.creatorId, false);

    setChallenges((prev) =>
      prev.map((c) => (c.id === challengeId ? { ...c, status: 'failed' } : c))
    );

    audio.playBurn();

    const feedItem: FeedItem = {
      id: 'feed_manual_burn_' + Date.now(),
      type: 'xp_burned',
      userId: target.creatorId,
      userName: target.creatorName,
      userAvatar: target.creatorAvatar,
      challengeId: target.id,
      challengeTitle: target.title,
      burnedXp: target.stakeXp,
      message: `Surrendered "${target.title}". Burned ${target.stakeXp} XP & streak reset to 0.`,
      timestamp: new Date().toISOString(),
      likes: []
    };
    setFeed((prev) => [feedItem, ...prev]);
  };

  // Like / Cheer social feed item
  const likeFeedItem = (feedId: string) => {
    setFeed((prev) =>
      prev.map((item) => {
        if (item.id !== feedId) return item;
        const alreadyLiked = item.likes.includes(currentUser.id);
        const newLikes = alreadyLiked
          ? item.likes.filter((id) => id !== currentUser.id)
          : [...item.likes, currentUser.id];
        return { ...item, likes: newLikes };
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
    (n) => n.userId === currentUser.id && !n.read
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
