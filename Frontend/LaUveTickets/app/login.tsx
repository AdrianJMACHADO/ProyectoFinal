import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useThemeColor';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      router.replace('/tickets');
    } catch (error) {
      Alert.alert('Error', 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
    },
    formContainer: {
      margin: 20,
      padding: 20,
      borderRadius: 10,
      elevation: 8,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      maxWidth: 500,
      alignSelf: 'center',
    },
    title: {
      textAlign: 'center',
      marginBottom: 10,
    },
    subtitle: {
      textAlign: 'center',
      marginBottom: 30,
    },
    input: {
      padding: 15,
      borderRadius: 5,
      marginBottom: 15,
      borderWidth: 1,
      fontSize: 16,
    },
    button: {
      padding: 15,
      borderRadius: 5,
      alignItems: 'center',
    },
    buttonText: {
      color: 'white',
    },
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedView type="card" style={styles.formContainer}>
        <ThemedText type="title" style={styles.title}>LaUve Tickets</ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>Inicia sesión para continuar</ThemedText>

        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.inputBackground,
            borderColor: theme.border,
            color: theme.text
          }]}
          placeholder="Email"
          placeholderTextColor={theme.placeholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.inputBackground,
            borderColor: theme.border,
            color: theme.text
          }]}
          placeholder="Contraseña"
          placeholderTextColor={theme.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.buttonPrimary }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <ThemedText type="button" style={styles.buttonText}>Iniciar Sesión</ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>
    </View>
  );
} 