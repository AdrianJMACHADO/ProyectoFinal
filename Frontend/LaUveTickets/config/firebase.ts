import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FirebaseApp,
  FirebaseOptions,
  deleteApp,
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app';
import {
  Auth,
  getAuth,
  initializeAuth,
} from 'firebase/auth';
import * as FirebaseAuth from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';

export type FirebaseConnectionConfig = FirebaseOptions & {
  projectId: string;
  apiKey: string;
  appId: string;
};

export const CURRENT_FIREBASE_CONFIG: FirebaseConnectionConfig = {
  apiKey: 'AIzaSyAWejvKBxaFkGcxS3nVgNSWvJCC0ZmUSc4',
  authDomain: 'lauvetickets.firebaseapp.com',
  projectId: 'lauvetickets',
  storageBucket: 'lauvetickets.firebasestorage.app',
  messagingSenderId: '438935408778',
  appId: '1:438935408778:web:addd769c086f25b7ad5d73',
  measurementId: 'G-8NPBBWBL3F',
};

let activeApp: FirebaseApp | null = null;
let activeAuth: Auth | null = null;
let activeDb: Firestore | null = null;
let activeStorage: FirebaseStorage | null = null;

const appNameForProject = (projectId: string) =>
  `lauvetickets-${projectId.replace(/[^a-zA-Z0-9-_]/g, '-')}`;

export const validateFirebaseConfig = (
  value: Partial<FirebaseConnectionConfig>,
): FirebaseConnectionConfig => {
  const requiredFields: Array<keyof FirebaseConnectionConfig> = [
    'apiKey',
    'appId',
    'projectId',
  ];
  const missing = requiredFields.filter(
    field => typeof value[field] !== 'string' || !value[field]?.trim(),
  );

  if (missing.length > 0) {
    throw new Error(`Faltan campos obligatorios: ${missing.join(', ')}`);
  }

  return {
    ...value,
    apiKey: value.apiKey!.trim(),
    appId: value.appId!.trim(),
    projectId: value.projectId!.trim(),
  } as FirebaseConnectionConfig;
};

export const initializeFirebaseConnection = (
  configValue: FirebaseConnectionConfig,
) => {
  const config = validateFirebaseConfig(configValue);
  const appName = appNameForProject(config.projectId);
  const existing = getApps().find(app => app.name === appName);

  activeApp = existing ?? initializeApp(config, appName);

  try {
    // Metro resuelve la variante React Native, que sí expone esta función.
    // Firebase 10 no la incluye en la declaración TypeScript genérica web.
    const reactNativePersistence = (
      FirebaseAuth as typeof FirebaseAuth & {
        getReactNativePersistence: (storage: typeof AsyncStorage) => never;
      }
    ).getReactNativePersistence(AsyncStorage);
    activeAuth = initializeAuth(activeApp, {
      persistence: reactNativePersistence,
    });
  } catch {
    activeAuth = getAuth(activeApp);
  }

  activeDb = getFirestore(activeApp);
  activeStorage = getStorage(activeApp);

  return {
    app: activeApp,
    auth: activeAuth,
    db: activeDb,
    storage: activeStorage,
  };
};

export const clearFirebaseConnection = async () => {
  const appToDelete = activeApp;
  activeApp = null;
  activeAuth = null;
  activeDb = null;
  activeStorage = null;

  if (appToDelete && getApps().some(app => app.name === appToDelete.name)) {
    await deleteApp(appToDelete);
  }
};

export const getFirebaseAuth = (): Auth => {
  if (!activeAuth) throw new Error('Firebase todavía no está configurado');
  return activeAuth;
};

export const getFirebaseDb = (): Firestore => {
  if (!activeDb) throw new Error('Firebase todavía no está configurado');
  return activeDb;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!activeStorage) throw new Error('Firebase todavía no está configurado');
  return activeStorage;
};

export const getActiveFirebaseApp = (): FirebaseApp => {
  if (!activeApp) throw new Error('Firebase todavía no está configurado');
  return activeApp;
};
