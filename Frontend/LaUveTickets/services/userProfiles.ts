import {
  Auth,
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  doc,
  collection,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
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
  username?: string;
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

const LOGIN_ALIASES = 'login_aliases';

export const normalizeUsername = (value: string) =>
  value.trim().toLowerCase();

export const isValidUsername = (value: string) =>
  /^[a-z0-9._-]{3,30}$/.test(normalizeUsername(value));

export const resolveLoginIdentifier = async (
  identifier: string,
): Promise<string> => {
  const normalized = normalizeUsername(identifier);
  if (normalized.includes('@')) return normalized;
  if (!isValidUsername(normalized)) {
    throw Object.assign(new Error('Usuario no válido'), {
      code: 'auth/invalid-credential',
    });
  }

  const alias = await getDoc(doc(getFirebaseDb(), LOGIN_ALIASES, normalized));
  const email = alias.exists() ? alias.data().email : null;
  if (typeof email !== 'string' || !email.includes('@')) {
    throw Object.assign(new Error('Usuario no encontrado'), {
      code: 'auth/invalid-credential',
    });
  }
  return email;
};

export const hasInitialOwner = async (): Promise<boolean> => {
  const snapshot = await getDoc(
    doc(getFirebaseDb(), 'configuracion', 'system'),
  );
  return snapshot.exists();
};

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
    initialized: true,
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
    await deleteUser(credential.user).catch(() => undefined);
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
  const username = normalizeUsername(input.nombre);
  if (!isValidUsername(username)) {
    throw new Error(
      'El nombre de usuario debe tener entre 3 y 30 caracteres y solo usar letras, números, punto, guion o guion bajo.',
    );
  }
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
      nombre: username,
      username,
      role: input.role,
      activo: true,
      createdAt: serverTimestamp(),
    };

    const db = getFirebaseDb();
    const aliasRef = doc(db, LOGIN_ALIASES, username);
    const profileRef = doc(db, 'usuarios', credential.user.uid);
    await runTransaction(db, async transaction => {
      const aliasSnapshot = await transaction.get(aliasRef);
      if (aliasSnapshot.exists()) {
        throw new Error('Ese nombre de usuario ya está en uso.');
      }
      transaction.set(aliasRef, {
        email: input.email.trim().toLowerCase(),
        uid: credential.user.uid,
      });
      transaction.set(profileRef, profile);
    });
    return profile;
  } catch (error) {
    if (auth.currentUser) {
      await deleteUser(auth.currentUser).catch(() => undefined);
    }
    throw error;
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

export const ensureUserLoginAliases = async (
  profiles: UserProfile[],
): Promise<void> => {
  const db = getFirebaseDb();
  await Promise.all(
    profiles.map(async profile => {
      if (profile.role === 'SUPERADMIN') return;
      const username = normalizeUsername(profile.username ?? profile.nombre);
      if (!isValidUsername(username) || !profile.email) return;
      const aliasRef = doc(db, LOGIN_ALIASES, username);
      await runTransaction(db, async transaction => {
        const existing = await transaction.get(aliasRef);
        if (existing.exists()) return;
        transaction.set(aliasRef, {
          email: profile.email.trim().toLowerCase(),
          uid: profile.uid,
        });
        transaction.update(doc(db, 'usuarios', profile.uid), { username });
      }).catch(() => undefined);
    }),
  );
};

export const sendManagedUserPasswordReset = async (
  email: string,
): Promise<void> => {
  await sendPasswordResetEmail(getFirebaseAuth(), email.trim().toLowerCase());
};

export const updateUserRole = async (
  uid: string,
  role: Exclude<UserRole, 'SUPERADMIN'>,
) => {
  await updateDoc(doc(getFirebaseDb(), 'usuarios', uid), { role });
};
