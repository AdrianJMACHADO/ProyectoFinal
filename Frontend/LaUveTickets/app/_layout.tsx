import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, usePathname } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
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

  const isPublicRoute =
    pathname === '/login' || pathname === '/registro-admin';
  const isEmployeeRoute =
    pathname === '/empleado' || pathname.startsWith('/tickets/');
  const showAuthLoading = loading || (user && !profile && !profileError);
  const showProfileError = user && !profile && profileError;

  return (
    <>
      {showAuthLoading && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            styles.overlay,
            { backgroundColor: theme.background },
          ]}
        >
          <ActivityIndicator size="large" color={theme.buttonPrimary} />
        </View>
      )}

      {showProfileError && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            styles.overlay,
            styles.profileErrorOverlay,
            { backgroundColor: theme.background },
          ]}
        >
          <Ionicons name="shield-outline" size={58} color={theme.error} />
          <ThemedText type="title" style={{ textAlign: 'center' }}>
            No se pudo abrir este usuario
          </ThemedText>
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
        </View>
      )}

      {!loading && !user && !isPublicRoute && <Redirect href="/login" />}

      {!loading
        && user
        && profile
        && role === 'EMPLEADO'
        && !isEmployeeRoute && (
          <Redirect href={'/empleado' as any} />
        )}

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
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileErrorOverlay: {
    padding: 28,
    gap: 16,
  },
});

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
