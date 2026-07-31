import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { hasInitialOwner } from '@/services/userProfiles';

export default function RegisterOwnerScreen() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<'create' | 'recover'>('create');
  const [checkingOwner, setCheckingOwner] = useState(true);
  const [ownerCheckUnavailable, setOwnerCheckUnavailable] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const { createOwner, recoverPassword, logout, user, profile } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  useEffect(() => {
    let active = true;
    hasInitialOwner()
      .then(initialized => {
        if (!active) return;
        setMode(initialized ? 'recover' : 'create');
        setOwnerCheckUnavailable(false);
      })
      .catch(() => {
        if (!active) return;
        // El modo seguro ante un fallo de lectura es recuperación.
        setMode('recover');
        setOwnerCheckUnavailable(true);
      })
      .finally(() => {
        if (active) setCheckingOwner(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async () => {
    setError(null);
    try {
      if (await hasInitialOwner()) {
        setMode('recover');
        setError(
          'Este negocio ya tiene superadministrador. Utiliza la recuperación de cuenta.',
        );
        return;
      }
    } catch {
      setMode('recover');
      setError(
        'No se pudo verificar la configuración. Por seguridad solo está disponible la recuperación.',
      );
      return;
    }
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
    } catch (registerError: any) {
      const message =
        registerError?.code === 'auth/email-already-in-use'
          ? 'Ese correo ya está registrado'
          : registerError?.message || 'No se pudo crear el administrador';
      setError(message);
      if (registerError?.code === 'auth/email-already-in-use') {
        setMode('recover');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecovery = async () => {
    setError(null);
    setSuccess(null);
    if (!email.trim()) {
      setError('Escribe el correo del superadministrador');
      return;
    }
    setSubmitting(true);
    try {
      await recoverPassword(email);
      setSuccess(
        'Te hemos enviado un correo para cambiar la contraseña. Revisa también la carpeta de spam.',
      );
    } catch (recoveryError: any) {
      setError(
        recoveryError?.code === 'auth/invalid-email'
          ? 'El correo no es válido'
          : 'No se pudo enviar el correo de recuperación',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const returnHome = async () => {
    await logout().catch(() => undefined);
    router.replace('/login');
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
    success: { color: theme.success, textAlign: 'center', lineHeight: 20 },
    white: { color: 'white' },
    modeRow: { flexDirection: 'row', gap: 10 },
    modeButton: {
      flex: 1,
      minHeight: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
  });

  if (user && profile) {
    return <Redirect href="/AppTabs" />;
  }

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
            {checkingOwner ? (
              <>
                <ActivityIndicator size="large" color={theme.buttonPrimary} />
                <ThemedText style={styles.subtitle}>
                  Comprobando la configuración del negocio…
                </ThemedText>
              </>
            ) : (
            <>
            <ThemedText type="title" style={styles.title}>
              {mode === 'create'
                ? 'Crea el administrador propietario'
                : 'Recupera el superadministrador'}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {mode === 'create'
                ? 'Esta será la cuenta principal y no podrá ser eliminada por otros administradores.'
                : 'Te enviaremos un enlace al correo del superadministrador para elegir una contraseña nueva.'}
            </ThemedText>

            {ownerCheckUnavailable && (
              <ThemedText style={styles.error}>
                No se pudo comprobar el estado del negocio. Por seguridad, solo
                puedes recuperar la cuenta existente.
              </ThemedText>
            )}

            {mode === 'create' && <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color={theme.placeholder} />
              <TextInput
                style={styles.input}
                value={nombre}
                onChangeText={setNombre}
                placeholder="Nombre"
                placeholderTextColor={theme.placeholder}
              />
            </View>}
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
            {mode === 'create' && <>
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
            </>}

            {error && <ThemedText style={styles.error}>{error}</ThemedText>}
            {success && <ThemedText style={styles.success}>{success}</ThemedText>}

            <TouchableOpacity
              style={[styles.button, submitting && { opacity: 0.65 }]}
              onPress={mode === 'create' ? handleSubmit : handleRecovery}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <ThemedText type="button" style={styles.white}>
                  {mode === 'create'
                    ? 'Crear administrador'
                    : 'Enviar correo de recuperación'}
                </ThemedText>
              )}
            </TouchableOpacity>
            </>
            )}

            <TouchableOpacity
              style={styles.linkButton}
              onPress={returnHome}
            >
              <ThemedText style={styles.link}>
                Volver al inicio e iniciar sesión
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
