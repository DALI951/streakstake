import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/challenge';
import { 
  auth, 
  db, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  doc, 
  getDoc, 
  setDoc,
  collection,
  onSnapshot
} from '../services/firebase';
import { audio } from '../services/audioService';

interface AuthContextType {
  currentUser: UserProfile | null;
  users: UserProfile[];
  loadingAuth: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  updateUserXp: (userId: string, xpDelta: number, stakeDelta?: number) => Promise<void>;
  updateUserStreak: (userId: string, increment: boolean) => Promise<void>;
  addFriend: (friendId: string) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'streakstake_authenticated_user_v2';
const LOCAL_STORAGE_ALL_USERS = 'streakstake_roster_users_v2';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_ALL_USERS);
    return saved ? JSON.parse(saved) : [];
  });
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);

  // Sync state to local storage for offline resilience
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_ALL_USERS, JSON.stringify(users));
  }, [users]);

  // Real-time Firestore Users roster listener
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
        const firestoreUsers: UserProfile[] = [];
        snapshot.forEach((d) => {
          firestoreUsers.push(d.data() as UserProfile);
        });
        if (firestoreUsers.length > 0) {
          setUsers(firestoreUsers);
        }
      }, (err) => {
        console.warn('Firestore users sync notice:', err.message);
      });
      return () => unsubscribe();
    } catch {
      // Offline fallback
    }
  }, []);

  // Real Firebase Auth state change listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoadingAuth(true);
      if (fbUser) {
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const profile = userDoc.data() as UserProfile;
            setCurrentUser(profile);
          } else {
            // New user registration in Firestore
            const newProfile: UserProfile = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Challenger',
              email: fbUser.email || `${fbUser.uid}@streakstake.app`,
              avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
              totalXp: 500, // Starter stake pool
              stakedXp: 0,
              currentStreak: 0,
              bestStreak: 0,
              challengesCompleted: 0,
              challengesFailed: 0,
              proofsVerifiedCount: 0,
              friends: [],
              weeklyXp: 0,
              createdAt: new Date().toISOString(),
              badges: [
                {
                  id: 'b1',
                  name: 'Arena Initiate',
                  description: 'Enlisted in StreakStake with 500 starter XP',
                  icon: '🛡️',
                  rarity: 'common',
                  unlockedAt: new Date().toISOString()
                }
              ]
            };
            await setDoc(userDocRef, newProfile);
            setCurrentUser(newProfile);
          }
        } catch {
          // If Firestore is restricted or in offline mode, construct valid profile
          if (!currentUser) {
            const fallbackProfile: UserProfile = {
              id: fbUser.uid,
              name: fbUser.displayName || fbUser.email?.split('@')[0] || 'Challenger',
              email: fbUser.email || `${fbUser.uid}@streakstake.app`,
              avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${fbUser.uid}`,
              totalXp: 500,
              stakedXp: 0,
              currentStreak: 0,
              bestStreak: 0,
              challengesCompleted: 0,
              challengesFailed: 0,
              proofsVerifiedCount: 0,
              friends: [],
              weeklyXp: 0,
              createdAt: new Date().toISOString(),
              badges: [
                {
                  id: 'b1',
                  name: 'Arena Initiate',
                  description: 'Enlisted in StreakStake with 500 starter XP',
                  icon: '🛡️',
                  rarity: 'common',
                  unlockedAt: new Date().toISOString()
                }
              ]
            };
            setCurrentUser(fallbackProfile);
          }
        }
      } else {
        // Logged out
        setCurrentUser(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<void> => {
    audio.playClick();
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (e: unknown) {
      console.warn('Google Popup sign in fallback:', e);
      // If running inside WebView / Capacitor where popups are blocked, handle gracefully:
      const guestId = 'user_google_' + Date.now().toString(36);
      const guestUser: UserProfile = {
        id: guestId,
        name: 'Google Challenger',
        email: 'challenger@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        totalXp: 500,
        stakedXp: 0,
        currentStreak: 0,
        bestStreak: 0,
        challengesCompleted: 0,
        challengesFailed: 0,
        proofsVerifiedCount: 0,
        friends: [],
        weeklyXp: 0,
        createdAt: new Date().toISOString(),
        badges: [
          {
            id: 'b1',
            name: 'Arena Initiate',
            description: 'Enlisted with 500 starter XP',
            icon: '🛡️',
            rarity: 'common',
            unlockedAt: new Date().toISOString()
          }
        ]
      };
      setCurrentUser(guestUser);
      setUsers((prev) => [guestUser, ...prev.filter(u => u.id !== guestId)]);
    }
  };

  const signInWithEmail = async (email: string, pass: string): Promise<void> => {
    audio.playClick();
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      // Local fallback if Firebase project Auth is not yet provisioned by user
      const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        setCurrentUser(existing);
        return;
      }
      throw e;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string): Promise<void> => {
    audio.playClick();
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      const profile: UserProfile = {
        id: res.user.uid,
        name: name.trim() || email.split('@')[0],
        email,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${res.user.uid}`,
        totalXp: 500,
        stakedXp: 0,
        currentStreak: 0,
        bestStreak: 0,
        challengesCompleted: 0,
        challengesFailed: 0,
        proofsVerifiedCount: 0,
        friends: [],
        weeklyXp: 0,
        createdAt: new Date().toISOString(),
        badges: [
          {
            id: 'b1',
            name: 'Arena Initiate',
            description: 'Enlisted with 500 starter XP',
            icon: '🛡️',
            rarity: 'common',
            unlockedAt: new Date().toISOString()
          }
        ]
      };
      try {
        await setDoc(doc(db, 'users', res.user.uid), profile);
      } catch {}
      setCurrentUser(profile);
      setUsers(prev => [profile, ...prev.filter(u => u.id !== profile.id)]);
    } catch (e) {
      // Clean fallback registration
      const newId = 'user_' + Date.now().toString(36);
      const profile: UserProfile = {
        id: newId,
        name: name.trim() || email.split('@')[0],
        email,
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${newId}`,
        totalXp: 500,
        stakedXp: 0,
        currentStreak: 0,
        bestStreak: 0,
        challengesCompleted: 0,
        challengesFailed: 0,
        proofsVerifiedCount: 0,
        friends: [],
        weeklyXp: 0,
        createdAt: new Date().toISOString(),
        badges: [
          {
            id: 'b1',
            name: 'Arena Initiate',
            description: 'Enlisted with 500 starter XP',
            icon: '🛡️',
            rarity: 'common',
            unlockedAt: new Date().toISOString()
          }
        ]
      };
      setCurrentUser(profile);
      setUsers(prev => [profile, ...prev.filter(u => u.id !== profile.id)]);
    }
  };

  const signOutUser = async (): Promise<void> => {
    audio.playClick();
    try {
      await signOut(auth);
    } catch {}
    setCurrentUser(null);
  };

  const updateUserXp = async (userId: string, xpDelta: number, stakeDelta: number = 0) => {
    setCurrentUser((prev) => {
      if (!prev || prev.id !== userId) return prev;
      const newTotal = Math.max(0, prev.totalXp + xpDelta);
      const newStaked = Math.max(0, prev.stakedXp + stakeDelta);
      const newWeekly = Math.max(0, prev.weeklyXp + (xpDelta > 0 ? xpDelta : 0));
      return {
        ...prev,
        totalXp: newTotal,
        stakedXp: newStaked,
        weeklyXp: newWeekly
      };
    });

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

    try {
      const userRef = doc(db, 'users', userId);
      const targetUser = users.find(u => u.id === userId) || currentUser;
      if (targetUser) {
        await setDoc(userRef, {
          totalXp: Math.max(0, targetUser.totalXp + xpDelta),
          stakedXp: Math.max(0, targetUser.stakedXp + stakeDelta)
        }, { merge: true });
      }
    } catch {}
  };

  const updateUserStreak = async (userId: string, increment: boolean) => {
    setCurrentUser((prev) => {
      if (!prev || prev.id !== userId) return prev;
      if (increment) {
        const nextStreak = prev.currentStreak + 1;
        return {
          ...prev,
          currentStreak: nextStreak,
          bestStreak: Math.max(prev.bestStreak, nextStreak),
          challengesCompleted: prev.challengesCompleted + 1
        };
      } else {
        return {
          ...prev,
          currentStreak: 0,
          challengesFailed: prev.challengesFailed + 1
        };
      }
    });

    setUsers((prev) =>
      prev.map((user) => {
        if (user.id !== userId) return user;
        if (increment) {
          const nextStreak = user.currentStreak + 1;
          return {
            ...user,
            currentStreak: nextStreak,
            bestStreak: Math.max(user.bestStreak, nextStreak),
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

  const addFriend = async (friendId: string) => {
    if (!currentUser) return;
    if (currentUser.friends.includes(friendId)) return;
    const newFriends = [...currentUser.friends, friendId];
    setCurrentUser(prev => prev ? { ...prev, friends: newFriends } : null);
    try {
      await setDoc(doc(db, 'users', currentUser.id), { friends: newFriends }, { merge: true });
    } catch {}
  };

  const removeFriend = async (friendId: string) => {
    if (!currentUser) return;
    const newFriends = currentUser.friends.filter(id => id !== friendId);
    setCurrentUser(prev => prev ? { ...prev, friends: newFriends } : null);
    try {
      await setDoc(doc(db, 'users', currentUser.id), { friends: newFriends }, { merge: true });
    } catch {}
  };

  const refreshUsers = () => {
    //
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        loadingAuth,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOutUser,
        updateUserXp,
        updateUserStreak,
        addFriend,
        removeFriend,
        refreshUsers
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
