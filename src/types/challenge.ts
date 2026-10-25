export type ChallengeCategory = 'fitness' | 'coding' | 'reading' | 'health' | 'mindset' | 'custom';

export type ChallengeStatus = 
  | 'active'               // Currently in progress, stake is locked
  | 'pending_verification' // User submitted proof, waiting for peer review
  | 'completed'            // Verified by peer, XP returned + bonus payout awarded!
  | 'failed'               // Deadline passed without completion, XP burned & streak reset
  | 'rejected';            // Peer rejected proof as fraudulent, XP burned

export interface ProofSubmission {
  id: string;
  submittedAt: string;
  notes?: string;
  imageUrl?: string;
  checklistItems?: { text: string; done: boolean }[];
  verifiedByUserId?: string;
  verifiedByUserName?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface Challenge {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  stakeXp: number;
  bonusMultiplier: number; // e.g. 1.0, 1.5 (on 3-streak), 2.0 (on 5-streak)
  deadline: string; // ISO string
  createdAt: string;
  status: ChallengeStatus;
  proofType: 'photo' | 'checklist' | 'mixed';
  proof?: ProofSubmission;
  isGroupChallenge: boolean;
  participantIds: string[]; // Friends participating and locking equal stake
  tags?: string[];
}

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string;
  totalXp: number;
  stakedXp: number;
  currentStreak: number;
  bestStreak: number;
  challengesCompleted: number;
  challengesFailed: number;
  proofsVerifiedCount: number;
  friends: string[]; // User IDs
  badges: UserBadge[];
  weeklyXp: number;
}

export type FeedEventType = 
  | 'challenge_staked'
  | 'proof_submitted'
  | 'challenge_verified'
  | 'xp_burned'
  | 'streak_milestone'
  | 'badge_unlocked';

export interface FeedItem {
  id: string;
  type: FeedEventType;
  userId: string;
  userName: string;
  userAvatar: string;
  challengeId?: string;
  challengeTitle?: string;
  stakeXp?: number;
  earnedXp?: number;
  burnedXp?: number;
  streakCount?: number;
  verifierName?: string;
  proofImageUrl?: string;
  message: string;
  timestamp: string;
  likes: string[]; // User IDs who cheered
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'verification_request' | 'stake_burned' | 'challenge_won' | 'friend_invite' | 'deadline_warning';
  read: boolean;
  timestamp: string;
  challengeId?: string;
}
