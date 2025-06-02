import { Redirect, Stack, usePathname } from 'expo-router';
import React from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Si está cargando, no mostrar nada
  if (loading) {
    return null;
  }

  // Si no hay usuario y no estamos en login, redirigir al login
  if (!user && pathname !== '/login') {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!user ? (
        // Rutas públicas
        <Stack.Screen 
          name="login" 
          options={{
            headerShown: false,
            // Permitir acceso sin autenticación
            gestureEnabled: false,
          }}
        />
      ) : (
        // Rutas protegidas
        <>
          <Stack.Screen name="tickets" />
          <Stack.Screen name="tickets/[id]" />
          <Stack.Screen name="ferias" />
          <Stack.Screen name="graficos-tickets" />
          <Stack.Screen name="graficos-ferias" />
        </>
      )}
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
