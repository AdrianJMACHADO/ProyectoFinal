import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function RegisterOwnerScreen() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { createOwner } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const handleSubmit = async () => {
    setError(null);
    if (!nombre.trim() || !email.trim() || !password) {
      setError('Completa todos los campos');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setSubmitting(true);
    try {
      await createOwner(nombre, email, password);
      router.replace('/tickets');
    } catch (registerError: any) {
      const message =
        registerError?.code === 'auth/email-already-in-use'
          ? 'Ese correo ya está registrado'
          : registerError?.message || 'No se pudo crear el administrador';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      width: '100%',
      maxWidth: 500,
      alignSelf: 'center',
      padding: 22,
      borderRadius: 18,
      gap: 14,
    },
    title: { textAlign: 'center' },
    subtitle: {
      textAlign: 'center',
      opacity: 0.72,
      marginBottom: 8,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 12,
    },
    input: {
      flex: 1,
      minHeight: 50,
      color: theme.text,
      paddingHorizontal: 10,
    },
    button: {
      minHeight: 50,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.buttonPrimary,
      marginTop: 4,
    },
    linkButton: {
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
    link: { color: theme.buttonPrimary, fontWeight: '600' },
    error: { color: theme.error, textAlign: 'center' },
    white: { color: 'white' },
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedView type="card" style={styles.card}>
            <ThemedText type="title" style={styles.title}>
              Crea el administrador propietario
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Esta será la cuenta principal y no podrá ser eliminada por otros
              administradores.
            </ThemedText>

            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color={theme.placeholder} />
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre"
                placeholderTextColor={theme.placeholder}
              />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={theme.placeholder} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Correo electrónico"
                placeholderTextColor={theme.placeholder}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.placeholder} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Contraseña"
                placeholderTextColor={theme.placeholder}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(value => !value)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.inputRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.placeholder} />
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Repetir contraseña"
                placeholderTextColor={theme.placeholder}
                secureTextEntry={!showPassword}
              />
            </View>

            {error && <ThemedText style={styles.error}>{error}</ThemedText>}

            <TouchableOpacity
              style={[styles.button, submitting && { opacity: 0.65 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <ThemedText type="button" style={styles.white}>
                  Crear administrador
                </ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.replace('/login')}
            >
              <ThemedText style={styles.link}>
                Ya existe un administrador: iniciar sesión
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

