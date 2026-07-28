import {
  Auth,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
} from 'firebase/auth';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  doc,
  collection,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  FirebaseConnectionConfig,
  getActiveFirebaseApp,
  getFirebaseAuth,
  getFirebaseDb,
} from '../config/firebase';

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'EMPLEADO';

export interface UserProfile {
  uid: string;
  email: string;
  nombre: string;
  role: UserRole;
  activo: boolean;
  createdAt?: unknown;
}

export interface CreateManagedUserInput {
  email: string;
  password: string;
  nombre: string;
  role: Exclude<UserRole, 'SUPERADMIN'>;
}

export const getUserProfile = async (
  user: User,
): Promise<UserProfile | null> => {
  const snapshot = await getDoc(doc(getFirebaseDb(), 'usuarios', user.uid));
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
};

export const createInitialOwnerProfile = async (
  user: User,
  nombre: string,
  nombreNegocio?: string,
): Promise<UserProfile> => {
  const db = getFirebaseDb();
  const systemRef = doc(db, 'configuracion', 'system');
  const profileRef = doc(db, 'usuarios', user.uid);

  const profile: UserProfile = {
    uid: user.uid,
    email: user.email ?? '',
    nombre: nombre.trim(),
    role: 'SUPERADMIN',
    activo: true,
  };
  const batch = writeBatch(db);

  batch.set(systemRef, {
    ownerUid: user.uid,
    nombreNegocio: nombreNegocio?.trim() || null,
    initializedAt: serverTimestamp(),
    schemaVersion: 1,
  });
  batch.set(profileRef, {
    ...profile,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'counters', 'ferias'), { nextId: 1 }, { merge: true });
  batch.set(doc(db, 'counters', 'tickets'), { nextId: 1 }, { merge: true });

  await batch.commit();
  return profile;
};

export const registerInitialOwner = async (
  email: string,
  password: string,
  nombre: string,
) => {
  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim(),
    password,
  );

  try {
    const profile = await createInitialOwnerProfile(credential.user, nombre);
    return { user: credential.user, profile };
  } catch (error) {
    await signOut(getFirebaseAuth());
    throw error;
  }
};

const createSecondaryAuth = (
  config: FirebaseConnectionConfig,
): { auth: Auth; cleanup: () => Promise<void> } => {
  const secondaryApp = initializeApp(
    config,
    `user-admin-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const auth = getFirebaseAuthForApp(secondaryApp);

  return {
    auth,
    cleanup: async () => {
      await signOut(auth).catch(() => undefined);
      await deleteApp(secondaryApp);
    },
  };
};

const getFirebaseAuthForApp = (app: ReturnType<typeof initializeApp>) => {
  return getAuth(app);
};

export const createManagedUser = async (
  input: CreateManagedUserInput,
): Promise<UserProfile> => {
  const activeApp = getActiveFirebaseApp();
  const { auth, cleanup } = createSecondaryAuth(
    activeApp.options as FirebaseConnectionConfig,
  );

  try {
    const credential = await createUserWithEmailAndPassword(
      auth,
      input.email.trim(),
      input.password,
    );
    const profile: UserProfile = {
      uid: credential.user.uid,
      email: input.email.trim(),
      nombre: input.nombre.trim(),
      role: input.role,
      activo: true,
      createdAt: serverTimestamp(),
    };

    await setDoc(doc(getFirebaseDb(), 'usuarios', credential.user.uid), profile);
    return profile;
  } finally {
    await cleanup();
  }
};

export const setUserEnabled = async (uid: string, activo: boolean) => {
  await updateDoc(doc(getFirebaseDb(), 'usuarios', uid), { activo });
};

export const listUserProfiles = async (): Promise<UserProfile[]> => {
  const snapshot = await getDocs(collection(getFirebaseDb(), 'usuarios'));
  return snapshot.docs
    .map(item => item.data() as UserProfile)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
};

export const updateUserRole = async (
  uid: string,
  role: Exclude<UserRole, 'SUPERADMIN'>,
) => {
  await updateDoc(doc(getFirebaseDb(), 'usuarios', uid), { role });
};
