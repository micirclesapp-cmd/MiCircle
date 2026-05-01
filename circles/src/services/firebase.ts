/* SECURITY: Phone numbers are stored in Firebase Auth ONLY.
   They must never be written to Firestore or returned to any client UI. */

import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';
import Constants from 'expo-constants';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || process.env.FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || process.env.FIREBASE_PROJECT_ID,
  databaseURL: Constants.expoConfig?.extra?.firebaseDatabaseUrl || process.env.FIREBASE_DATABASE_URL,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.firebaseAppId || process.env.FIREBASE_APP_ID,
};

console.log('Firebase config:', { ...firebaseConfig, apiKey: '***' });

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

console.log('Firebase app initialized:', app.name);

// Firebase Services
export const auth = getAuth(app);
export const db = getDatabase(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);

// Firebase Cloud Messaging (native FCM — only available on physical devices)
// Note: Circles uses Expo Push Service which routes through FCM/APNs,
// so the native messaging SDK is not required for push to work.
// This is kept for future direct FCM usage only.
let messaging: ReturnType<typeof getMessaging> | undefined;
try {
  if (typeof navigator !== 'undefined' && navigator.product !== 'ReactNative') {
    // Web only — native RN builds use expo-notifications instead
    messaging = getMessaging(app);
  }
} catch {
  // Silently ignore — expo-notifications handles push on native
}
export { messaging };

// Enable offline persistence for Firestore
enableIndexedDbPersistence(firestore).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.log('Firestore persistence: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.log('Firestore persistence: Browser does not support');
  }
});

export default app;
