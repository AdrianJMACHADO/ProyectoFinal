import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();

  // Mostrar indicador de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={{
          marginTop: 16,
          fontSize: 16,
          color: '#6c757d'
        }}>
          Cargando...
        </Text>
      </View>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    return <Redirect href="/login" />;
  }

  // Si hay usuario autenticado, redirigir a la página principal de tickets
  return <Redirect href="/tickets" />;
}