import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useThemeColor';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Modal, Platform, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useFirebaseConfig } from '../contexts/FirebaseConfigContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [credentialError, setCredentialError] = useState<string | null>(null);
  const [inputErrors, setInputErrors] = useState<{ email?: boolean; password?: boolean }>({});
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [connectionMenuVisible, setConnectionMenuVisible] = useState(false);
  const { login } = useAuth();
  const { config, disconnect } = useFirebaseConfig();
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
    AsyncStorage.getItem('@lauvetickets/last-login-email').then(storedEmail => {
      if (storedEmail) setEmail(storedEmail);
    });

    if (Platform.OS === 'web') {
      const storedError = localStorage.getItem('showLoginError');
      if (storedError === 'invalid-credentials') {
        setLoginError('Credenciales invalidas');
        localStorage.removeItem('showLoginError');
      }
    }
  }, []);

  const handleLogin = async () => {
    setLoginError(null);
    setCredentialError(null);
    setInputErrors({});

    const errors: { email?: boolean; password?: boolean } = {};
    if (!email) errors.email = true;
    if (!password) errors.password = true;

    if (Object.keys(errors).length > 0) {
      setInputErrors(errors);
      setLoginError('Por favor, completa todos los campos');
      return;
    }

    try {
      setLoading(true);
      await AsyncStorage.setItem(
        '@lauvetickets/last-login-email',
        email.trim().toLowerCase(),
      );
      await login(email, password);
      router.replace('/AppTabs');
    } catch (error: any) {
      const code = error?.code;
      const invalidCredentials = [
        'auth/invalid-credential',
        'auth/invalid-email',
        'auth/user-not-found',
        'auth/wrong-password',
      ].includes(code);

      setLoginError(
        invalidCredentials
          ? 'El correo o la contraseña no son correctos.'
          : code === 'auth/too-many-requests'
            ? 'Demasiados intentos. Espera unos minutos y vuelve a probar.'
            : 'No se pudo iniciar sesión. Comprueba tu conexión e inténtalo de nuevo.',
      );
      setInputErrors({ password: true });
      setCredentialError('El usuario o la contraseña no son correctos.');
      if (invalidCredentials) {
        setPassword('');
        requestAnimationFrame(() => passwordInputRef.current?.focus());
      }
      return;
      /*
      // console.error("Login failed:", error);
      if (Platform.OS === 'web') {
        if (error && error.code === 'auth/invalid-email') {
          localStorage.setItem('showLoginError', 'invalid-credentials');
          setLoginError('Credenciales invalidas');
        } else {
          setLoginError('Ocurrió un error al iniciar sesión.');
        }
      } else {
        Alert.alert('Error', 'Credenciales inválidas');
        setLoginError(null);
      }
      */
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
      width: width * 0.9,
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
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 5,
      marginBottom: 15,
      backgroundColor: theme.inputBackground,
      borderWidth: 1,
      borderColor: theme.border,
    },
    input: {
      flex: 1,
      padding: 15,
      fontSize: 16,
      backgroundColor: 'transparent',
      color: theme.text
    },
    inputErrorBorder: {
      borderColor: theme.error,
      borderWidth: 2,
    },
    button: {
      padding: 15,
      borderRadius: 5,
      alignItems: 'center',
    },
    buttonText: {
      color: 'white',
    },
    errorText: {
      color: theme.error,
      textAlign: 'center',
      marginTop: 15,
      marginBottom: 10,
      zIndex: 1,
    },
    connectionButton: {
      position: 'absolute',
      top: insets.top + 10,
      left: 14,
      zIndex: 10,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 22,
      backgroundColor: theme.inputBackground,
    },
    projectText: {
      textAlign: 'center',
      opacity: 0.55,
      fontSize: 12,
      marginTop: -20,
      marginBottom: 22,
    },
    connectionOverlay: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
    },
    connectionCard: {
      width: '100%',
      maxWidth: 420,
      padding: 22,
      gap: 14,
      borderRadius: 16,
    },
    connectionActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    connectionAction: {
      minHeight: 44,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
    },
  });

  return (
    <TouchableWithoutFeedback onPress={Platform.OS === 'ios' || Platform.OS === 'android' ? Keyboard.dismiss : undefined}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={styles.connectionButton}
          onPress={() => setConnectionMenuVisible(true)}
          accessibilityLabel="Opciones del proyecto Firebase"
        >
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
        </TouchableOpacity>
        <ThemedView type="card" style={styles.formContainer}>
          <ThemedText type="title" style={styles.title}>LaUve Tickets</ThemedText>
          <ThemedText type="subtitle" style={styles.subtitle}>Inicia sesión para continuar</ThemedText>
          <ThemedText style={styles.projectText}>
            Firebase: {config?.projectId}
          </ThemedText>

          <View style={[styles.inputContainer, inputErrors.email && styles.inputErrorBorder]}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={theme.placeholder}
              value={email}
              onChangeText={(text) => { setEmail(text); setLoginError(null); setInputErrors(prev => ({ ...prev, email: false })); }}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />
          </View>

          <View
            style={[
              styles.inputContainer,
              (inputErrors.password || credentialError)
                && styles.inputErrorBorder,
            ]}
          >
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={theme.placeholder}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setLoginError(null);
                setCredentialError(null);
                setInputErrors(prev => ({ ...prev, password: false }));
              }}
              secureTextEntry={!isPasswordVisible}
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setIsPasswordVisible(!isPasswordVisible)} style={{ padding: 10 }}>
              <Ionicons
                name={isPasswordVisible ? "eye-off" : "eye"}
                size={24}
                color={theme.text}
              />
            </TouchableOpacity>
          </View>

          {credentialError && (
            <ThemedText type="default" style={styles.errorText}>
              {credentialError}
            </ThemedText>
          )}

          {loginError && !credentialError && (
            <ThemedText type="default" style={styles.errorText}>{loginError}</ThemedText>
          )}

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

          <TouchableOpacity
            style={{ paddingVertical: 16, alignItems: 'center' }}
            onPress={() => router.push('/registro-admin' as any)}
            disabled={loading}
          >
            <ThemedText style={{ color: theme.buttonPrimary, fontWeight: '600' }}>
              Crear o recuperar superadministrador
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>

        <Modal
          visible={connectionMenuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setConnectionMenuVisible(false)}
        >
          <TouchableWithoutFeedback
            onPress={() => setConnectionMenuVisible(false)}
          >
            <View style={styles.connectionOverlay}>
              <TouchableWithoutFeedback onPress={() => undefined}>
                <ThemedView type="card" style={styles.connectionCard}>
                  <ThemedText type="subtitle">Proyecto Firebase</ThemedText>
                  <ThemedText>
                    Conectado a: {config?.projectId ?? 'desconocido'}
                  </ThemedText>
                  <View style={styles.connectionActions}>
                    <TouchableOpacity
                      style={[
                        styles.connectionAction,
                        { backgroundColor: theme.inputBackground },
                      ]}
                      onPress={() => setConnectionMenuVisible(false)}
                    >
                      <ThemedText>Cancelar</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.connectionAction,
                        { backgroundColor: theme.error },
                      ]}
                      onPress={async () => {
                        setConnectionMenuVisible(false);
                        await disconnect();
                      }}
                    >
                      <ThemedText type="button" style={{ color: 'white' }}>
                        Cambiar proyecto
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </ThemedView>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}
