import { User, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getFirebaseAuth } from '../config/firebase';
import {
  registerInitialOwner,
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
        setProfile(await getUserProfile(user));
      } catch (error) {
        setProfileError((error as Error).message);
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
    try {
      const result = await registerInitialOwner(email, password, nombre);
      setUser(result.user);
      setProfile(result.profile);
    } finally {
      setLoading(false);
    }
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
  logout: () => Promise<void>;
}
