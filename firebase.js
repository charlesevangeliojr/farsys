import { initializeApp } from 'firebase/app';
import { getFirestore, serverTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Free-tier only: config comes from .env (EXPO_PUBLIC_*).
// Storage bucket optional — leave blank to run Firestore-only without Blaze.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  ...(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
    ? { storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET }
    : {}),
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  ...(process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
    ? { measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID }
    : {}),
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (free tier)
export const db = getFirestore(app);

// Initialize Storage only when a bucket is configured (requires Blaze).
// Null when free-tier only — upload helpers skip upload and keep local URI.
let storage = null;
try {
  if (process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET) {
    storage = getStorage(app);
  } else {
    console.log('Storage disabled (free tier):/uploads will use local URI.');
  }
} catch (e) {
  console.log('Storage unavailable, running Firestore-only:', e?.message);
}
export { storage };

// Export serverTimestamp for automatic timestamps
export { serverTimestamp };

export default app;
