import {
  User,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getFirebaseAuth } from '../config/firebase';
import {
  registerInitialOwner,
  createInitialOwnerProfile,
  getUserProfile,
  UserProfile,
  UserRole,
} from '../services/userProfiles';

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Proveedor del contexto
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const creatingOwnerRef = useRef(false);

  useEffect(() => {
    const auth = getFirebaseAuth();
    // Configurar el listener de autenticación
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setProfile(null);
      setProfileError(null);

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const existingProfile = await getUserProfile(user);
        if (existingProfile) {
          setProfile(existingProfile);
        } else {
          setProfile(
            await createInitialOwnerProfile(
              user,
              user.displayName || user.email || 'Propietario',
            ),
          );
        }
      } catch (error) {
        if (creatingOwnerRef.current) {
          setLoading(false);
          return;
        }
        try {
          // Recupera proyectos cuyo primer perfil no llegó a crearse por las
          // reglas iniciales. El propio ruleset garantiza que solo el primer
          // usuario autenticado puede convertirse en propietario.
          const recoveredProfile = await createInitialOwnerProfile(
            user,
            user.displayName || user.email || 'Propietario',
          );
          setProfile(recoveredProfile);
        } catch (recoveryError) {
          setProfileError((recoveryError as Error).message);
        }
      } finally {
        setLoading(false);
      }
    });

    // Limpiar el listener al desmontar el componente
    return () => unsubscribe();
  }, []);

  // Función de login
  const login = async (email: string, password: string) => {
    const auth = getFirebaseAuth();
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Función de logout
  const logout = async () => {
    const auth = getFirebaseAuth();
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createOwner = async (
    nombre: string,
    email: string,
    password: string,
  ) => {
    setLoading(true);
    setProfileError(null);
    creatingOwnerRef.current = true;
    try {
      const result = await registerInitialOwner(email, password, nombre);
      setUser(result.user);
      setProfile(result.profile);
    } finally {
      creatingOwnerRef.current = false;
      setLoading(false);
    }
  };

  const recoverPassword = async (email: string) => {
    await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        profileError,
        loading,
        login,
        createOwner,
        recoverPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Tipo para el contexto
interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  profileError: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  createOwner: (
    nombre: string,
    email: string,
    password: string,
  ) => Promise<void>;
  recoverPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}
