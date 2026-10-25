import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  updateDoc, 
  deleteDoc, 
  Firestore,
  serverTimestamp
} from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const STORAGE_KEY_FIREBASE_CONFIG = 'streakstake_firebase_config_v1';

// Default Firebase configuration (can be customized via env or in-app settings)
const DEFAULT_CONFIG: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyD-placeholder-streakstake-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "streakstake-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "streakstake-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "streakstake-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "739281928374",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:739281928374:web:89a19c7f6b4e2d"
};

export function getSavedFirebaseConfig(): FirebaseConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const saved = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

export function saveFirebaseConfig(config: FirebaseConfig) {
  localStorage.setItem(STORAGE_KEY_FIREBASE_CONFIG, JSON.stringify(config));
}

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

try {
  const config = getSavedFirebaseConfig();
  app = getApps().length > 0 ? getApp() : initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn('Firebase initialization notice:', e);
  app = initializeApp(DEFAULT_CONFIG);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { 
  app, 
  auth, 
  db, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  serverTimestamp
};
export type { FirebaseUser };
