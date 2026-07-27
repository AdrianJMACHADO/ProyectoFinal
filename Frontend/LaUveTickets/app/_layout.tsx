import { Redirect, Stack, usePathname } from 'expo-router';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import {
  FirebaseConfigProvider,
  useFirebaseConfig,
} from '../contexts/FirebaseConfigContext';

function RootLayoutNav() {
  const { user, role, loading } = useAuth();
  const pathname = usePathname();

  // Si está cargando, no mostrar nada
  if (loading) {
    return null;
  }

  // Si no hay usuario y no estamos en login, redirigir al login
  if (
    !user
    && pathname !== '/login'
    && pathname !== '/registro-admin'
  ) {
    return <Redirect href="/login" />;
  }

  if (
    user
    && role === 'EMPLEADO'
    && pathname !== '/tickets'
    && !pathname.startsWith('/tickets/')
  ) {
    return <Redirect href="/tickets" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 220,
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
      }}
    >
      {!user ? (
        // Rutas públicas
        <>
        <Stack.Screen 
          name="login" 
          options={{
            headerShown: false,
            // Permitir acceso sin autenticación
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="registro-admin"
          options={{ headerShown: false, gestureEnabled: true }}
        />
        </>
      ) : (
        // Rutas protegidas
        <>
          <Stack.Screen name="tickets" />
          <Stack.Screen
            name="tickets/[id]"
            options={{
              animation: 'slide_from_right',
              animationDuration: 280,
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
            }}
          />
          <Stack.Screen name="ferias" />
          <Stack.Screen name="graficos-tickets" />
          <Stack.Screen name="graficos-ferias" />
          <Stack.Screen name="usuarios" />
        </>
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <FirebaseConfigProvider>
      <SafeAreaProvider>
        <FirebaseConfiguredApp />
      </SafeAreaProvider>
    </FirebaseConfigProvider>
  );
}

function FirebaseConfiguredApp() {
  const { configured, loading } = useFirebaseConfig();
  const pathname = usePathname();

  if (loading) return null;

  if (!configured) {
    if (pathname !== '/configuracion-firebase') {
      return <Redirect href={'/configuracion-firebase' as any} />;
    }

    return (
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen
          name="configuracion-firebase"
          options={{ gestureEnabled: false }}
        />
      </Stack>
    );
  }

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
