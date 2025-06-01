import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="tickets" />
        <Stack.Screen name="ferias" />
      </Stack>
    </AuthProvider>
  );
}
