import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    getReactNativePersistence,
    initializeAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    User
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAWejvKBxaFkGcxS3nVgNSWvJCC0ZmUSc4",
  authDomain: "lauvetickets.firebaseapp.com",
  projectId: "lauvetickets",
  storageBucket: "lauvetickets.firebasestorage.app",
  messagingSenderId: "438935408778",
  appId: "1:438935408778:web:addd769c086f25b7ad5d73",
  measurementId: "G-8NPBBWBL3F"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}

// Definir el tipo para el contexto
type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Proveedor del contexto
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar cambios en el estado de autenticación
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Función de login
  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
    } catch (error) {
      throw error;
    }
  };

  // Función de logout
  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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