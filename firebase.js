import { initializeApp } from 'firebase/app';
import { getFirestore, serverTimestamp } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB-MpLoTUFJp1a9z7WNm1WAYZPBzKgnKVs",
  authDomain: "schedule-app-54891.firebaseapp.com",
  databaseURL: "https://schedule-app-54891-default-rtdb.firebaseio.com",
  projectId: "schedule-app-54891",
  storageBucket: "schedule-app-54891.firebasestorage.app",
  messagingSenderId: "768744608837",
  appId: "1:768744608837:web:37fc117456a5d5e0a3bf2c",
  measurementId: "G-4WQP40W10T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Export serverTimestamp for automatic timestamps
export { serverTimestamp };

export default app;
