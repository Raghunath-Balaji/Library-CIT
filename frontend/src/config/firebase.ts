import { Platform } from 'react-native';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth, Persistence } from 'firebase/auth';
import { Firestore, getFirestore, initializeFirestore } from 'firebase/firestore';
import { Analytics, getAnalytics, isSupported } from 'firebase/analytics';

// Exact Firebase configuration imported from root fbconfig.txt
export const firebaseConfig = {
  apiKey: "AIzaSyBadvR3ChdJ0M1xd6HB7VaIwAXvaBVKAO8",
  authDomain: "library-5f8b2.firebaseapp.com",
  projectId: "library-5f8b2",
  storageBucket: "library-5f8b2.firebasestorage.app",
  messagingSenderId: "82765761555",
  appId: "1:82765761555:web:c613465c46d21c5822c3e6",
  measurementId: "G-V44ZK1WGRQ"
};

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Cross-platform Auth initialization (AsyncStorage on Expo Go / Native, local persistence on Web)
let authInstance: Auth;
if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else {
  try {
    const firebaseAuthModule = require('firebase/auth') as {
      getReactNativePersistence?: (storage: unknown) => Persistence;
    };
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (firebaseAuthModule.getReactNativePersistence && AsyncStorage) {
      authInstance = initializeAuth(app, {
        persistence: firebaseAuthModule.getReactNativePersistence(AsyncStorage)
      });
    } else {
      authInstance = getAuth(app);
    }
  } catch {
    authInstance = getAuth(app);
  }
}

// Cross-platform Firestore with auto long-polling fallback for Expo Go React Native WebSocket stability
let dbInstance: Firestore;
try {
  dbInstance = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true
  });
} catch {
  dbInstance = getFirestore(app);
}

// Web-only Analytics initialization (safe no-op on Android/iOS native)
export const analyticsPromise: Promise<Analytics | null> =
  Platform.OS === 'web'
    ? isSupported()
        .then((supported) => (supported ? getAnalytics(app) : null))
        .catch(() => null)
    : Promise.resolve(null);

export const firebaseApp = app;
export const auth = authInstance;
export const db = dbInstance;
