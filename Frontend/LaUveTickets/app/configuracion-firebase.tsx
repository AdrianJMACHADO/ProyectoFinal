import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  CURRENT_FIREBASE_CONFIG,
  FirebaseConnectionConfig,
  validateFirebaseConfig,
} from '@/config/firebase';
import { useFirebaseConfig } from '@/contexts/FirebaseConfigContext';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
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

const EXAMPLE_CONFIG = `{
  "apiKey": "AIza...",
  "authDomain": "mi-proyecto.firebaseapp.com",
  "projectId": "mi-proyecto",
  "storageBucket": "mi-proyecto.firebasestorage.app",
  "messagingSenderId": "123456789",
  "appId": "1:123456789:web:abcdef"
}`;

export default function FirebaseSetupScreen() {
  const [configText, setConfigText] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const { connect, loading } = useFirebaseConfig();
  const theme = useTheme();

  const connectConfig = async (config: FirebaseConnectionConfig) => {
    setFormError(null);
    try {
      await connect(config);
    } catch (error) {
      setFormError(
        (error as Error).message || 'No se pudo conectar con Firebase',
      );
    }
  };

  const handleConnectJson = async () => {
    try {
      const parsed = JSON.parse(configText);
      await connectConfig(validateFirebaseConfig(parsed));
    } catch (error) {
      setFormError(
        error instanceof SyntaxError
          ? 'El texto no contiene una configuración JSON válida'
          : (error as Error).message,
      );
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      width: '100%',
      maxWidth: 620,
      alignSelf: 'center',
      borderRadius: 18,
      padding: 22,
      gap: 16,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${theme.buttonPrimary}20`,
    },
    title: {
      textAlign: 'center',
    },
    description: {
      textAlign: 'center',
      opacity: 0.75,
      lineHeight: 21,
    },
    sectionLabel: {
      fontWeight: '700',
      marginTop: 4,
    },
    input: {
      minHeight: 190,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBackground,
      color: theme.text,
      borderRadius: 12,
      padding: 14,
      textAlignVertical: 'top',
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
      fontSize: 12,
    },
    primaryButton: {
      minHeight: 50,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.buttonPrimary,
    },
    secondaryButton: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    whiteText: {
      color: 'white',
    },
    error: {
      color: theme.error,
      textAlign: 'center',
    },
    help: {
      fontSize: 12,
      opacity: 0.65,
      lineHeight: 18,
    },
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
            <View style={styles.iconContainer}>
              <Ionicons
                name="cloud-outline"
                size={36}
                color={theme.buttonPrimary}
              />
            </View>

            <ThemedText type="title" style={styles.title}>
              Configura tu almacenamiento
            </ThemedText>
            <ThemedText style={styles.description}>
              Conecta LaUveTickets con un proyecto Firebase de tu propiedad. Los
              tickets, ferias y usuarios se guardarán exclusivamente en ese
              proyecto.
            </ThemedText>

            <ThemedText style={styles.sectionLabel}>
              Configuración de la aplicación web
            </ThemedText>
            <TextInput
              style={styles.input}
              value={configText}
              onChangeText={text => {
                setConfigText(text);
                setFormError(null);
              }}
              placeholder={EXAMPLE_CONFIG}
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />

            {formError && (
              <ThemedText style={styles.error}>{formError}</ThemedText>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, loading && { opacity: 0.65 }]}
              onPress={handleConnectJson}
              disabled={loading || !configText.trim()}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <View style={styles.buttonRow}>
                  <Ionicons name="link" size={20} color="white" />
                  <ThemedText type="button" style={styles.whiteText}>
                    Conectar mi Firebase
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => connectConfig(CURRENT_FIREBASE_CONFIG)}
              disabled={loading}
            >
              <ThemedText type="button">
                Usar Firebase actual para pruebas
              </ThemedText>
            </TouchableOpacity>

            <ThemedText style={styles.help}>
              Esta configuración identifica el proyecto, pero no concede
              permisos administrativos. La seguridad seguirá dependiendo de
              Firebase Authentication y de sus reglas de Firestore.
            </ThemedText>
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

