import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAWejvKBxaFkGcxS3nVgNSWvJCC0ZmUSc4",
  authDomain: "lauvetickets.firebaseapp.com",
  projectId: "lauvetickets",
  storageBucket: "lauvetickets.firebasestorage.app",
  messagingSenderId: "438935408778",
  appId: "1:438935408778:web:addd769c086f25b7ad5d73",
  measurementId: "G-8NPBBWBL3F"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Firebase Auth works in Expo Go through the Firebase JavaScript SDK.
const auth = getAuth(app);

// Initialize other services
export const db = getFirestore(app);
export const storage = getStorage(app);

export { auth };
export default app;
