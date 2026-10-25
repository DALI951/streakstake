import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/challenge';
import { StorageService } from '../services/storageService';
import { audio } from '../services/audioService';

interface AuthContextType {
  currentUser: UserProfile;
  users: UserProfile[];
  switchUser: (userId: string) => void;
  signInWithGoogle: () => Promise<void>;
  updateUserXp: (userId: string, xpDelta: number, stakeDelta?: number) => void;
  updateUserStreak: (userId: string, increment: boolean) => void;
  addFriend: (friendId: string) => void;
  removeFriend: (friendId: string) => void;
  refreshUsers: () => void;
  resetAllData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(() => StorageService.getUsers());
  const [currentUserId, setCurrentUserId] = useState<string>(() => StorageService.getCurrentUserId());

  useEffect(() => {
    StorageService.saveUsers(users);
  }, [users]);

  useEffect(() => {
    StorageService.setCurrentUserId(currentUserId);
  }, [currentUserId]);

  const currentUser = users.find((u) => u.id === currentUserId) || users[0];

  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      audio.playClick();
      setCurrentUserId(userId);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    audio.playClick();
    // Simulate real Google OAuth popup & user creation
    const googleUser: UserProfile = {
      id: 'user_google_' + Date.now().toString(36),
      name: 'Google Challenger',
      email: 'user.challenger@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      totalXp: 500, // Starter stake pool
      stakedXp: 0,
      currentStreak: 0,
      bestStreak: 0,
      challengesCompleted: 0,
      challengesFailed: 0,
      proofsVerifiedCount: 0,
      friends: ['user_alex', 'user_sarah'],
      weeklyXp: 0,
      badges: [
        {
          id: 'b1',
          name: 'First Blood',
          description: 'Joined the arena and initialized accountability stake balance',
          icon: '🛡️',
          rarity: 'common',
          unlockedAt: new Date().toISOString()
        }
      ]
    };

    setUsers((prev) => {
      const updated = [googleUser, ...prev];
      StorageService.saveUsers(updated);
      return updated;
    });
    setCurrentUserId(googleUser.id);
  };

  const updateUserXp = (userId: string, xpDelta: number, stakeDelta: number = 0) => {
    setUsers((prev) =>
      prev.map((user) => {
        if (user.id !== userId) return user;
        const newTotal = Math.max(0, user.totalXp + xpDelta);
        const newStaked = Math.max(0, user.stakedXp + stakeDelta);
        const newWeekly = Math.max(0, user.weeklyXp + (xpDelta > 0 ? xpDelta : 0));
        return {
          ...user,
          totalXp: newTotal,
          stakedXp: newStaked,
          weeklyXp: newWeekly
        };
      })
    );
  };

  const updateUserStreak = (userId: string, increment: boolean) => {
    setUsers((prev) =>
      prev.map((user) => {
        if (user.id !== userId) return user;
        if (increment) {
          const newStreak = user.currentStreak + 1;
          const best = Math.max(user.bestStreak, newStreak);
          return {
            ...user,
            currentStreak: newStreak,
            bestStreak: best,
            challengesCompleted: user.challengesCompleted + 1
          };
        } else {
          return {
            ...user,
            currentStreak: 0,
            challengesFailed: user.challengesFailed + 1
          };
        }
      })
    );
  };

  const addFriend = (friendId: string) => {
    setUsers((prev) =>
      prev.map((user) => {
        if (user.id === currentUserId) {
          if (user.friends.includes(friendId)) return user;
          return { ...user, friends: [...user.friends, friendId] };
        }
        return user;
      })
    );
  };

  const removeFriend = (friendId: string) => {
    setUsers((prev) =>
      prev.map((user) => {
        if (user.id === currentUserId) {
          return { ...user, friends: user.friends.filter((id) => id !== friendId) };
        }
        return user;
      })
    );
  };

  const refreshUsers = () => {
    setUsers(StorageService.getUsers());
  };

  const resetAllData = () => {
    StorageService.resetDefaults();
    setUsers(StorageService.getUsers());
    setCurrentUserId('user_alex');
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        switchUser,
        signInWithGoogle,
        updateUserXp,
        updateUserStreak,
        addFriend,
        removeFriend,
        refreshUsers,
        resetAllData
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
