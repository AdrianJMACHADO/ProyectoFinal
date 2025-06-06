import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Platform, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback, useWindowDimensions, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [inputErrors, setInputErrors] = useState<{ email?: boolean; password?: boolean }>({});
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const passwordInputRef = useRef<TextInput>(null);

  useEffect(() => {
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
      await login(email, password);
      router.replace('/tickets');
    } catch (error: any) {
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
    }
  });

  return (
    <TouchableWithoutFeedback onPress={Platform.OS === 'ios' || Platform.OS === 'android' ? Keyboard.dismiss : undefined}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ThemedView type="card" style={styles.formContainer}>
          <ThemedText type="title" style={styles.title}>LaUve Tickets</ThemedText>
          <ThemedText type="subtitle" style={styles.subtitle}>Inicia sesión para continuar</ThemedText>

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

          <View style={[styles.inputContainer, inputErrors.password && styles.inputErrorBorder]}>
            <TextInput
              ref={passwordInputRef}
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor={theme.placeholder}
              value={password}
              onChangeText={(text) => { setPassword(text); setLoginError(null); setInputErrors(prev => ({ ...prev, password: false })); }}
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

          {loginError && (
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
        </ThemedView>
      </View>
    </TouchableWithoutFeedback>
  );
}