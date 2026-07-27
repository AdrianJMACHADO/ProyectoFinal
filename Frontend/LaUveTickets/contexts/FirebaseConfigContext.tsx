import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  clearFirebaseConnection,
  FirebaseConnectionConfig,
  initializeFirebaseConnection,
  validateFirebaseConfig,
} from '../config/firebase';

const CONFIG_STORAGE_KEY = '@lauvetickets/firebase-connection-v1';

interface FirebaseConfigContextValue {
  config: FirebaseConnectionConfig | null;
  loading: boolean;
  error: string | null;
  configured: boolean;
  connect: (config: FirebaseConnectionConfig) => Promise<void>;
  disconnect: () => Promise<void>;
}

const FirebaseConfigContext = createContext<FirebaseConfigContextValue | undefined>(
  undefined,
);

export function FirebaseConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [config, setConfig] = useState<FirebaseConnectionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restore = async () => {
      try {
        const stored = await AsyncStorage.getItem(CONFIG_STORAGE_KEY);
        if (!stored) return;

        const restored = validateFirebaseConfig(JSON.parse(stored));
        initializeFirebaseConnection(restored);
        setConfig(restored);
      } catch (restoreError) {
        setError(
          (restoreError as Error).message ||
            'No se pudo recuperar la configuración de Firebase',
        );
        await AsyncStorage.removeItem(CONFIG_STORAGE_KEY);
      } finally {
        setLoading(false);
      }
    };

    restore();
  }, []);

  const connect = async (newConfig: FirebaseConnectionConfig) => {
    setLoading(true);
    setError(null);
    try {
      const validated = validateFirebaseConfig(newConfig);
      await clearFirebaseConnection();
      initializeFirebaseConnection(validated);
      await AsyncStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(validated));
      setConfig(validated);
    } catch (connectionError) {
      const message =
        (connectionError as Error).message ||
        'No se pudo conectar con el proyecto Firebase';
      setError(message);
      throw connectionError;
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    setError(null);
    try {
      await clearFirebaseConnection();
      await AsyncStorage.removeItem(CONFIG_STORAGE_KEY);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo(
    () => ({
      config,
      loading,
      error,
      configured: config !== null,
      connect,
      disconnect,
    }),
    [config, loading, error],
  );

  return (
    <FirebaseConfigContext.Provider value={value}>
      {children}
    </FirebaseConfigContext.Provider>
  );
}

export function useFirebaseConfig() {
  const context = useContext(FirebaseConfigContext);
  if (!context) {
    throw new Error(
      'useFirebaseConfig debe utilizarse dentro de FirebaseConfigProvider',
    );
  }
  return context;
}
