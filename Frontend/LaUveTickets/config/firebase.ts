import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, getReactNativePersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from 'firebase/storage';
import { Platform } from 'react-native';

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

// Initialize Auth with appropriate persistence based on platform
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

// Initialize other services
export const db = getFirestore(app);
export const storage = getStorage(app);

export { auth };
export default app; 