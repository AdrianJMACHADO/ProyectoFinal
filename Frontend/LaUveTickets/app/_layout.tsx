import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, usePathname } from 'expo-router';
import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import {
  FirebaseConfigProvider,
  useFirebaseConfig,
} from '../contexts/FirebaseConfigContext';

function RootLayoutNav() {
  const { user, profile, role, profileError, loading, logout } = useAuth();
  const pathname = usePathname();
  const theme = useTheme();

  // Si está cargando, no mostrar nada
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.background,
        }}
      >
        <ActivityIndicator size="large" color={theme.buttonPrimary} />
      </View>
    );
  }

  if (user && !profile) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 28,
          gap: 16,
          backgroundColor: theme.background,
        }}
      >
        {profileError ? (
          <Ionicons name="shield-outline" size={58} color={theme.error} />
        ) : (
          <ActivityIndicator size="large" color={theme.buttonPrimary} />
        )}
        <ThemedText type="title" style={{ textAlign: 'center' }}>
          {profileError
            ? 'No se pudo abrir este usuario'
            : 'Preparando tu cuenta…'}
        </ThemedText>
        {profileError && (
          <>
            <ThemedText style={{ textAlign: 'center', opacity: 0.75 }}>
              La sesión existe, pero no tiene un perfil autorizado en este
              negocio. Vuelve al inicio para acceder con otra cuenta o recuperar
              el superadministrador.
            </ThemedText>
            <TouchableOpacity
              style={{
                minHeight: 50,
                borderRadius: 12,
                paddingHorizontal: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.buttonPrimary,
              }}
              onPress={logout}
            >
              <ThemedText type="button" style={{ color: 'white' }}>
                Volver al inicio
              </ThemedText>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
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
    && pathname !== '/empleado'
    && !pathname.startsWith('/tickets/')
  ) {
    return <Redirect href={'/empleado' as any} />;
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
      
          <Stack.Screen name="tickets" />
          <Stack.Screen
            name="empleado"
            options={{
              animation: 'fade',
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="AppTabs"
            options={{
              animation: 'fade',
              gestureEnabled: false,
            }}
          />
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
          <Stack.Screen
            name="ajustes"
            options={{
              animation: 'slide_from_right',
              gestureEnabled: true,
              fullScreenGestureEnabled: true,
            }}
          />
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
