import { Challenge, FeedItem, NotificationItem, UserProfile } from '../types/challenge';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_alex',
    name: 'Alex Vance',
    email: 'alex.vance@streakstake.dev',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    totalXp: 950,
    stakedXp: 150,
    currentStreak: 2,
    bestStreak: 7,
    challengesCompleted: 14,
    challengesFailed: 2,
    proofsVerifiedCount: 8,
    friends: ['user_sarah', 'user_marcus', 'user_elena'],
    weeklyXp: 420,
    badges: [
      { id: 'b1', name: 'First Blood', description: 'Staked and won your first accountability challenge', icon: '🗡️', rarity: 'common', unlockedAt: '2026-10-10' },
      { id: 'b2', name: 'Triple Threat', description: 'Achieved a 3-challenge streak with 1.5x multiplier payout', icon: '🔥', rarity: 'rare', unlockedAt: '2026-10-15' },
      { id: 'b4', name: 'Fair Arbiter', description: 'Verified 5 peer proof submissions', icon: '⚖️', rarity: 'rare', unlockedAt: '2026-10-18' }
    ]
  },
  {
    id: 'user_sarah',
    name: 'Sarah Chen',
    email: 'sarah.chen@streakstake.dev',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    totalXp: 1420,
    stakedXp: 200,
    currentStreak: 3,
    bestStreak: 12,
    challengesCompleted: 26,
    challengesFailed: 1,
    proofsVerifiedCount: 15,
    friends: ['user_alex', 'user_marcus', 'user_elena'],
    weeklyXp: 680,
    badges: [
      { id: 'b1', name: 'First Blood', description: 'Staked and won your first accountability challenge', icon: '🗡️', rarity: 'common', unlockedAt: '2026-10-01' },
      { id: 'b2', name: 'Triple Threat', description: 'Achieved a 3-challenge streak with 1.5x multiplier payout', icon: '🔥', rarity: 'rare', unlockedAt: '2026-10-05' },
      { id: 'b3', name: 'High Roller', description: 'Locked in 200+ XP on a single stake', icon: '💎', rarity: 'epic', unlockedAt: '2026-10-12' },
      { id: 'b4', name: 'Fair Arbiter', description: 'Verified 5 peer proof submissions', icon: '⚖️', rarity: 'rare', unlockedAt: '2026-10-14' }
    ]
  },
  {
    id: 'user_marcus',
    name: 'Marcus Brody',
    email: 'marcus.brody@streakstake.dev',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    totalXp: 680,
    stakedXp: 100,
    currentStreak: 0, // Just burned his streak!
    bestStreak: 5,
    challengesCompleted: 9,
    challengesFailed: 4,
    proofsVerifiedCount: 4,
    friends: ['user_alex', 'user_sarah'],
    weeklyXp: 180,
    badges: [
      { id: 'b1', name: 'First Blood', description: 'Staked and won your first accountability challenge', icon: '🗡️', rarity: 'common', unlockedAt: '2026-10-03' }
    ]
  },
  {
    id: 'user_elena',
    name: 'Elena Rostova',
    email: 'elena.rostova@streakstake.dev',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    totalXp: 2150,
    stakedXp: 350,
    currentStreak: 6,
    bestStreak: 18,
    challengesCompleted: 39,
    challengesFailed: 2,
    proofsVerifiedCount: 22,
    friends: ['user_alex', 'user_sarah'],
    weeklyXp: 920,
    badges: [
      { id: 'b1', name: 'First Blood', description: 'Staked and won your first challenge', icon: '🗡️', rarity: 'common', unlockedAt: '2026-09-20' },
      { id: 'b2', name: 'Triple Threat', description: 'Achieved a 3-challenge streak with 1.5x multiplier', icon: '🔥', rarity: 'rare', unlockedAt: '2026-09-25' },
      { id: 'b3', name: 'High Roller', description: 'Locked in 200+ XP on a single stake', icon: '💎', rarity: 'epic', unlockedAt: '2026-10-02' },
      { id: 'b5', name: 'Iron Will', description: 'Maintained a 7+ unbroken streak', icon: '🛡️', rarity: 'epic', unlockedAt: '2026-10-18' },
      { id: 'b6', name: 'Legendary', description: 'Surpassed 2,000 total verified XP', icon: '👑', rarity: 'legendary', unlockedAt: '2026-10-22' }
    ]
  }
];

// Helper to calculate future deadline ISO string
const getFutureTime = (hoursFromNow: number) => {
  return new Date(Date.now() + hoursFromNow * 3600 * 1000).toISOString();
};

export const INITIAL_CHALLENGES: Challenge[] = [
  {
    id: 'c_pending_sarah',
    creatorId: 'user_sarah',
    creatorName: 'Sarah Chen',
    creatorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    title: '5km Morning Sunrise Run',
    description: 'Paced run under 28 mins before 8 AM. Need peer review on Strava snapshot!',
    category: 'fitness',
    stakeXp: 150,
    bonusMultiplier: 1.5, // 3-streak multiplier bonus in play!
    deadline: getFutureTime(3),
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    status: 'pending_verification',
    proofType: 'photo',
    proof: {
      id: 'p_sarah_1',
      submittedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      notes: 'Crushed it! 5.12 km in 26:40. Pace chart in the photo.',
      imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80',
    },
    isGroupChallenge: false,
    participantIds: ['user_sarah', 'user_alex'],
    tags: ['Fitness', 'Running', 'Cardio']
  },
  {
    id: 'c_active_alex',
    creatorId: 'user_alex',
    creatorName: 'Alex Vance',
    creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    title: 'Ship Authentication & Test Suite',
    description: 'Write 10 comprehensive unit tests and push clean commit to main before midnight.',
    category: 'coding',
    stakeXp: 150,
    bonusMultiplier: 1.0,
    deadline: getFutureTime(5),
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: 'active',
    proofType: 'photo',
    isGroupChallenge: true,
    participantIds: ['user_alex', 'user_sarah', 'user_elena'],
    tags: ['Coding', 'TypeScript', 'Dev']
  },
  {
    id: 'c_active_elena',
    creatorId: 'user_elena',
    creatorName: 'Elena Rostova',
    creatorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    title: 'Deep Focus: Read 30 Pages of System Design',
    description: 'No smartphone distraction, highlight 3 key design patterns from DDIA.',
    category: 'reading',
    stakeXp: 200,
    bonusMultiplier: 2.0, // 5-streak multiplier!
    deadline: getFutureTime(8),
    createdAt: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    status: 'active',
    proofType: 'checklist',
    isGroupChallenge: false,
    participantIds: ['user_elena'],
    tags: ['Learning', 'Focus']
  },
  {
    id: 'c_burned_marcus',
    creatorId: 'user_marcus',
    creatorName: 'Marcus Brody',
    creatorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    title: 'Zero Sugar & Fast Food Day',
    description: 'Whole foods only. Water and black coffee.',
    category: 'health',
    stakeXp: 100,
    bonusMultiplier: 1.0,
    deadline: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    status: 'failed',
    proofType: 'checklist',
    isGroupChallenge: false,
    participantIds: ['user_marcus'],
    tags: ['Diet', 'Health']
  }
];

export const INITIAL_FEED: FeedItem[] = [
  {
    id: 'feed_1',
    type: 'proof_submitted',
    userId: 'user_sarah',
    userName: 'Sarah Chen',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    challengeId: 'c_pending_sarah',
    challengeTitle: '5km Morning Sunrise Run',
    stakeXp: 150,
    proofImageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&auto=format&fit=crop&q=80',
    message: 'Submitted proof for "5km Morning Sunrise Run". Waiting for a friend to verify!',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    likes: ['user_alex', 'user_elena']
  },
  {
    id: 'feed_2',
    type: 'xp_burned',
    userId: 'user_marcus',
    userName: 'Marcus Brody',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    challengeId: 'c_burned_marcus',
    challengeTitle: 'Zero Sugar & Fast Food Day',
    burnedXp: 100,
    streakCount: 0,
    message: 'Missed deadline on "Zero Sugar & Fast Food Day". Burned 100 XP and reset streak to 0!',
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    likes: []
  },
  {
    id: 'feed_3',
    type: 'streak_milestone',
    userId: 'user_elena',
    userName: 'Elena Rostova',
    userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    streakCount: 6,
    message: 'Reached an elite 6-day streak! Active multiplier boosted to 2.0x on next win.',
    timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    likes: ['user_alex', 'user_sarah', 'user_marcus']
  },
  {
    id: 'feed_4',
    type: 'challenge_staked',
    userId: 'user_alex',
    userName: 'Alex Vance',
    userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    challengeId: 'c_active_alex',
    challengeTitle: 'Ship Authentication & Test Suite',
    stakeXp: 150,
    message: 'Locked in 150 XP on group challenge "Ship Authentication & Test Suite".',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    likes: ['user_sarah']
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    userId: 'user_alex',
    title: 'Friend Verification Requested',
    body: 'Sarah Chen completed "5km Morning Sunrise Run" and requested your verification!',
    type: 'verification_request',
    read: false,
    timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    challengeId: 'c_pending_sarah'
  },
  {
    id: 'notif_2',
    userId: 'user_alex',
    title: 'Deadline Approaching',
    body: '5 hours remaining on "Ship Authentication & Test Suite". Don\'t let your 150 XP burn!',
    type: 'deadline_warning',
    read: true,
    timestamp: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
    challengeId: 'c_active_alex'
  }
];

const STORAGE_KEYS = {
  USERS: 'streakstake_users_v1',
  CURRENT_USER_ID: 'streakstake_active_user_v1',
  CHALLENGES: 'streakstake_challenges_v1',
  FEED: 'streakstake_feed_v1',
  NOTIFICATIONS: 'streakstake_notifications_v1',
};

export const StorageService = {
  getUsers(): UserProfile[] {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_USERS;
    }
  },

  saveUsers(users: UserProfile[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  getCurrentUserId(): string {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'user_alex';
  },

  setCurrentUserId(id: string) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, id);
  },

  getChallenges(): Challenge[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CHALLENGES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CHALLENGES, JSON.stringify(INITIAL_CHALLENGES));
      return INITIAL_CHALLENGES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_CHALLENGES;
    }
  },

  saveChallenges(challenges: Challenge[]) {
    localStorage.setItem(STORAGE_KEYS.CHALLENGES, JSON.stringify(challenges));
  },

  getFeed(): FeedItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.FEED);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.FEED, JSON.stringify(INITIAL_FEED));
      return INITIAL_FEED;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_FEED;
    }
  },

  saveFeed(feed: FeedItem[]) {
    localStorage.setItem(STORAGE_KEYS.FEED, JSON.stringify(feed));
  },

  getNotifications(): NotificationItem[] {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  },

  saveNotifications(notifs: NotificationItem[]) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
  },

  resetDefaults() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'user_alex');
    localStorage.setItem(STORAGE_KEYS.CHALLENGES, JSON.stringify(INITIAL_CHALLENGES));
    localStorage.setItem(STORAGE_KEYS.FEED, JSON.stringify(INITIAL_FEED));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
  }
};
