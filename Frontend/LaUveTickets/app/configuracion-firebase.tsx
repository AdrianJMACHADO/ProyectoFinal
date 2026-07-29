import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import {
  CURRENT_FIREBASE_CONFIG,
  FirebaseConnectionConfig,
  getFirebaseAuth,
  validateFirebaseConfig,
} from '@/config/firebase';
import { useFirebaseConfig } from '@/contexts/FirebaseConfigContext';
import { useTheme } from '@/hooks/useThemeColor';
import {
  configureFirebaseAuthentication,
  FirebaseAuthenticationSetupRequired,
  FirebaseConsoleActivationRequired,
  listRecoverableFirebaseProjects,
  provisionFirebaseProject,
  RecoverableFirebaseProject,
} from '@/services/googleCloudProvisioning';
import { createInitialOwnerProfile } from '@/services/userProfiles';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Step =
  | 'welcome'
  | 'business'
  | 'creating'
  | 'authentication'
  | 'recovering'
  | 'projects'
  | 'firebaseActivation';
const GOOGLE_CLOUD_SCOPE =
  'https://www.googleapis.com/auth/cloud-platform';
const SUPPORT_EMAIL = 'adrianjuangarcia2@gmail.com';

const projectIdFor = (businessName: string) => {
  const name =
    businessName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 18) || 'negocio';
  const suffix = Crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  return `luve-${name}-${suffix}`.slice(0, 30);
};

export default function FirebaseSetupScreen() {
  const theme = useTheme();
  const { connect } = useFirebaseConfig();
  const [step, setStep] = useState<Step>('welcome');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [tokens, setTokens] = useState<{
    accessToken: string;
    idToken: string;
  } | null>(null);
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [progress, setProgress] = useState('Preparando el asistente…');
  const progressRef = useRef('Preparando el asistente…');
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [configText, setConfigText] = useState('');
  const [pendingSetup, setPendingSetup] = useState<{
    projectId: string;
    config: FirebaseConnectionConfig;
  } | null>(null);
  const [recoverableProjects, setRecoverableProjects] = useState<
    RecoverableFirebaseProject[]
  >([]);
  const [canRequestAccess, setCanRequestAccess] = useState(false);
  const [accessEmail, setAccessEmail] = useState('');
  const [pendingFirebaseProject, setPendingFirebaseProject] = useState<{
    projectId: string;
    businessName: string;
  } | null>(null);
  const hiddenConnectionRunning = useRef(false);

  const connectOriginalFirebase = async () => {
    if (step !== 'welcome' || hiddenConnectionRunning.current) return;

    hiddenConnectionRunning.current = true;
    setError(null);
    try {
      await connect(CURRENT_FIREBASE_CONFIG);
    } catch {
      setError('No se pudo conectar con el espacio de soporte.');
      hiddenConnectionRunning.current = false;
    }
  };

  const requestTestAccess = async () => {
    const email = accessEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Escribe el correo de Google con el que quieres acceder.');
      return;
    }
    const subject = encodeURIComponent('LaUveTickets');
    const body = encodeURIComponent(
      [
        'Alguien solicita acceso a LaUveTickets.',
        '',
        `Correo de Google que debe autorizarse: ${email}`,
        '',
        'Cuando esté autorizado, el cliente volverá a intentar iniciar sesión en la aplicación.',
      ].join('\n'),
    );
    await Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  };

  const finishBusinessSetup = async (
    config: FirebaseConnectionConfig,
    currentTokens = tokens,
  ) => {
    if (!currentTokens) throw new Error('Vuelve a conectar tu cuenta de Google');
    progressRef.current = 'Creando tu cuenta de propietario…';
    setProgress(progressRef.current);
    await connect(config);
    const credential = GoogleAuthProvider.credential(currentTokens.idToken);
    const signedIn = await signInWithCredential(getFirebaseAuth(), credential);
    await createInitialOwnerProfile(
      signedIn.user,
      ownerName,
      businessName.trim(),
    );
  };

  const authenticateGoogle = async (forceAccountSelection = false) => {
    if (Constants.appOwnership === 'expo') {
      throw new Error(
        'Esta función necesita la APK de LaUveTickets y no puede ejecutarse dentro de Expo Go.',
      );
    }

    const { GoogleSignin } = require(
      '@react-native-google-signin/google-signin',
    ) as typeof import('@react-native-google-signin/google-signin');
    GoogleSignin.configure({ scopes: [GOOGLE_CLOUD_SCOPE] });
    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    if (forceAccountSelection) {
      // Solo se cierra la sesión local para que Google vuelva a mostrar su
      // selector. La cuenta no se revoca ni se elimina del dispositivo.
      await GoogleSignin.signOut().catch(() => undefined);
    }

    const result = await GoogleSignin.signIn();
    if (result.type !== 'success') return null;

    if (!result.data.scopes.includes(GOOGLE_CLOUD_SCOPE)) {
      const authorization = await GoogleSignin.addScopes({
        scopes: [GOOGLE_CLOUD_SCOPE],
      });
      if (
        !authorization
        || authorization.type !== 'success'
        || !authorization.data
        || !authorization.data.scopes.includes(GOOGLE_CLOUD_SCOPE)
      ) {
        throw new Error(
          'Google no concedió el permiso para acceder a tu espacio privado',
        );
      }
    }

    const googleTokens = await GoogleSignin.getTokens();
    const account = {
      name: result.data.user.name || result.data.user.email || 'Propietario',
      email: result.data.user.email,
    };
    const nextTokens = {
      accessToken: googleTokens.accessToken,
      idToken: googleTokens.idToken,
    };
    setOwnerName(account.name);
    setAccessEmail(account.email);
    setSelectedGoogleAccount(account);
    setTokens(nextTokens);
    return nextTokens;
  };

  const chooseGoogleAccount = async () => {
    setError(null);
    setCanRequestAccess(false);
    setTokens(null);
    setSelectedGoogleAccount(null);
    try {
      await authenticateGoogle(true);
    } catch (googleError) {
      const message = (googleError as Error).message;
      if (message.includes('Expo Go') || message.includes('APK')) {
        setError(message);
        return;
      }
      setCanRequestAccess(true);
      setError(
        'No puedes acceder con esta cuenta porque LaUveTickets está en periodo de pruebas. Contacta con soporte para solicitar acceso.',
      );
    }
  };

  const connectGoogle = async () => {
    setError(null);
    setCanRequestAccess(false);
    try {
      const currentTokens = tokens || await authenticateGoogle(false);
      if (!currentTokens) return;
      setStep('business');
    } catch (googleError) {
      const message = (googleError as Error).message;
      if (message.includes('Expo Go') || message.includes('APK')) {
        setError(message);
        return;
      }
      setCanRequestAccess(true);
      setError(
        'No puedes acceder con esta cuenta porque LaUveTickets está en periodo de pruebas. Contacta con soporte para solicitar acceso.',
      );
    }
  };

  const recoverBusinesses = async () => {
    setError(null);
    setCanRequestAccess(false);
    setStep('recovering');
    try {
      const currentTokens = tokens || await authenticateGoogle(false);
      if (!currentTokens) {
        setStep('welcome');
        return;
      }
      const projects = await listRecoverableFirebaseProjects(
        currentTokens.accessToken,
      );
      setRecoverableProjects(projects);
      setStep('projects');
    } catch (recoveryError) {
      setStep('welcome');
      const message = (recoveryError as Error).message;
      if (message.includes('Expo Go') || message.includes('APK')) {
        setError(message);
        return;
      }
      setCanRequestAccess(true);
      setError(
        'No puedes acceder con esta cuenta porque LaUveTickets está en periodo de pruebas. Contacta con soporte para solicitar acceso.',
      );
    }
  };

  const restoreProject = async (project: RecoverableFirebaseProject) => {
    setError(null);
    setStep('recovering');
    try {
      await connect(project.config);
      if (tokens?.idToken) {
        const credential = GoogleAuthProvider.credential(tokens.idToken);
        await signInWithCredential(getFirebaseAuth(), credential);
      }
    } catch (restoreError) {
      setStep('projects');
      setError(
        (restoreError as Error).message
        || 'No se pudo recuperar este negocio',
      );
    }
  };

  const createBusiness = async () => {
    const name = businessName.trim();
    if (!name) {
      setError('Escribe el nombre de tu negocio');
      return;
    }
    if (!tokens) {
      setStep('welcome');
      setError('Vuelve a conectar tu cuenta de Google');
      return;
    }

    setError(null);
    setStep('creating');
    const projectId = projectIdFor(name);
    try {
      const config = await provisionFirebaseProject({
        accessToken: tokens.accessToken,
        projectId,
        businessName: name,
        onProgress: item => {
          progressRef.current = item.message;
          setProgress(item.message);
        },
      });
      progressRef.current = 'Creando tu cuenta de propietario…';
      setProgress(progressRef.current);
      await finishBusinessSetup(config);
    } catch (creationError) {
      if (creationError instanceof FirebaseConsoleActivationRequired) {
        setPendingFirebaseProject({
          projectId: creationError.projectId,
          businessName: name,
        });
        setStep('firebaseActivation');
        return;
      }
      if (creationError instanceof FirebaseAuthenticationSetupRequired) {
        setPendingSetup({
          projectId: creationError.projectId,
          config: creationError.config,
        });
        setStep('authentication');
        return;
      }
      setStep('business');
      setError(
        `${progressRef.current} ${(creationError as Error).message ||
          'No se pudo terminar de crear el negocio'}`,
      );
    }
  };

  const openAuthenticationSetup = async () => {
    if (!pendingSetup) return;
    await WebBrowser.openBrowserAsync(
      `https://console.firebase.google.com/project/${pendingSetup.projectId}/authentication/providers`,
    );
  };

  const openFirebaseActivation = async () => {
    if (!pendingFirebaseProject) return;
    await WebBrowser.openBrowserAsync(
      'https://console.firebase.google.com/',
    );
  };

  const continueAfterFirebaseActivation = async () => {
    if (!pendingFirebaseProject) return;
    setError(null);
    setStep('creating');
    progressRef.current = 'Comprobando la activación de Firebase…';
    setProgress(progressRef.current);
    try {
      const { GoogleSignin } = require(
        '@react-native-google-signin/google-signin',
      ) as typeof import('@react-native-google-signin/google-signin');
      const refreshedTokens = await GoogleSignin.getTokens();
      const currentTokens = {
        accessToken: refreshedTokens.accessToken,
        idToken: refreshedTokens.idToken,
      };
      setTokens(currentTokens);
      const config = await provisionFirebaseProject({
        accessToken: currentTokens.accessToken,
        projectId: pendingFirebaseProject.projectId,
        businessName: pendingFirebaseProject.businessName,
        projectAlreadyCreated: true,
        onProgress: item => {
          progressRef.current = item.message;
          setProgress(item.message);
        },
      });
      await finishBusinessSetup(config, currentTokens);
      setPendingFirebaseProject(null);
    } catch (activationError) {
      if (activationError instanceof FirebaseAuthenticationSetupRequired) {
        setPendingSetup({
          projectId: activationError.projectId,
          config: activationError.config,
        });
        setStep('authentication');
        return;
      }
      setStep('firebaseActivation');
      setError(
        activationError instanceof FirebaseConsoleActivationRequired
          ? 'Firebase todavía no está activado para esta cuenta. Completa los pasos indicados y vuelve a intentarlo.'
          : (activationError as Error).message,
      );
    }
  };

  const continueAfterAuthentication = async () => {
    if (!pendingSetup || !tokens) return;
    setError(null);
    setStep('creating');
    progressRef.current = 'Comprobando la activación de usuarios…';
    setProgress(progressRef.current);
    try {
      const { GoogleSignin } = require(
        '@react-native-google-signin/google-signin',
      ) as typeof import('@react-native-google-signin/google-signin');
      const refreshedTokens = await GoogleSignin.getTokens();
      const currentTokens = {
        accessToken: refreshedTokens.accessToken,
        idToken: refreshedTokens.idToken,
      };
      setTokens(currentTokens);
      await configureFirebaseAuthentication(
        pendingSetup.projectId,
        currentTokens.accessToken,
      );
      await finishBusinessSetup(pendingSetup.config, currentTokens);
      setPendingSetup(null);
    } catch (setupError) {
      setStep('authentication');
      const message = (setupError as Error).message || '';
      setError(
        message.includes('CONFIGURATION_NOT_FOUND')
          ? 'Aún falta pulsar “Comenzar” en Authentication de Firebase.'
          : message,
      );
    }
  };

  const connectAdvanced = async () => {
    setError(null);
    try {
      await connect(
        validateFirebaseConfig(
          JSON.parse(configText) as FirebaseConnectionConfig,
        ),
      );
    } catch (advancedError) {
      setError(
        advancedError instanceof SyntaxError
          ? 'La configuración pegada no es válida'
          : (advancedError as Error).message,
      );
    }
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: theme.background },
        content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
        card: {
          width: '100%',
          maxWidth: 520,
          alignSelf: 'center',
          borderRadius: 22,
          padding: 24,
          gap: 16,
        },
        icon: {
          width: 72,
          height: 72,
          borderRadius: 24,
          alignSelf: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${theme.buttonPrimary}20`,
        },
        title: { textAlign: 'center' },
        description: {
          textAlign: 'center',
          opacity: 0.76,
          lineHeight: 22,
        },
        benefit: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        benefitText: { flex: 1, opacity: 0.82 },
        accountCard: {
          minHeight: 58,
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 13,
          backgroundColor: `${theme.buttonPrimary}10`,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 11,
        },
        accountDetails: { flex: 1 },
        accountName: { fontWeight: '700' },
        accountEmail: { opacity: 0.68, fontSize: 13, marginTop: 2 },
        input: {
          minHeight: 52,
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.inputBackground,
          color: theme.text,
          borderRadius: 12,
          paddingHorizontal: 14,
          fontSize: 16,
        },
        jsonInput: {
          minHeight: 130,
          paddingTop: 12,
          textAlignVertical: 'top',
          fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
          fontSize: 12,
        },
        primary: {
          minHeight: 52,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.buttonPrimary,
        },
        secondary: {
          minHeight: 52,
          borderRadius: 13,
          borderWidth: 1,
          borderColor: theme.buttonPrimary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        projectList: { gap: 10 },
        projectCard: {
          minHeight: 64,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 13,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        },
        projectName: { flex: 1 },
        buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 9 },
        white: { color: 'white' },
        back: { alignSelf: 'center', padding: 8 },
        backText: { color: theme.buttonPrimary, fontWeight: '600' },
        error: { color: theme.error, textAlign: 'center', lineHeight: 20 },
        advanced: {
          borderTopWidth: 1,
          borderTopColor: theme.border,
          marginTop: 8,
          paddingTop: 12,
          gap: 12,
        },
        advancedToggle: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: 6,
        },
        subtle: { opacity: 0.58, fontSize: 12 },
        progressRing: { marginVertical: 10 },
      }),
    [theme],
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedView type="card" style={styles.card}>
            <TouchableOpacity
              style={styles.icon}
              activeOpacity={1}
              delayLongPress={8000}
              onLongPress={connectOriginalFirebase}
              disabled={step !== 'welcome'}
              accessibilityRole="image"
              accessibilityLabel="LaUveTickets"
            >
              <Ionicons
                name={step === 'creating' ? 'sparkles' : 'storefront-outline'}
                size={38}
                color={theme.buttonPrimary}
              />
            </TouchableOpacity>

            {step === 'welcome' && (
              <>
                <ThemedText type="title" style={styles.title}>
                  Bienvenido a LaUveTickets
                </ThemedText>
                <ThemedText style={styles.description}>
                  Tus tickets y ferias se guardarán en un espacio privado de tu
                  propia cuenta de Google.
                </ThemedText>
                {[
                  'Tus datos no se mezclan con los de otros negocios',
                  'Tú mantienes el control de tu información',
                  'La configuración se hace automáticamente',
                ].map(text => (
                  <View style={styles.benefit} key={text}>
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#38b86b"
                    />
                    <ThemedText style={styles.benefitText}>{text}</ThemedText>
                  </View>
                ))}
                {error && <ThemedText style={styles.error}>{error}</ThemedText>}
                {canRequestAccess && (
                  <>
                    <ThemedText style={styles.description}>
                      Escribe el mismo correo de Google que intentaste utilizar.
                      Se preparará un mensaje para solicitar su autorización.
                    </ThemedText>
                    <TextInput
                      style={styles.input}
                      value={accessEmail}
                      onChangeText={value => {
                        setAccessEmail(value);
                        setError(null);
                      }}
                      placeholder="tu-cuenta@gmail.com"
                      placeholderTextColor={theme.placeholder}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.secondary}
                      onPress={requestTestAccess}
                    >
                      <View style={styles.buttonContent}>
                        <Ionicons
                          name="mail-outline"
                          size={21}
                          color={theme.buttonPrimary}
                        />
                        <ThemedText
                          type="button"
                          style={{ color: theme.buttonPrimary }}
                        >
                          Enviar solicitud a soporte
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
                {selectedGoogleAccount && (
                  <View style={styles.accountCard}>
                    <Ionicons
                      name="person-circle-outline"
                      size={30}
                      color={theme.buttonPrimary}
                    />
                    <View style={styles.accountDetails}>
                      <ThemedText style={styles.accountName}>
                        {selectedGoogleAccount.name}
                      </ThemedText>
                      <ThemedText style={styles.accountEmail}>
                        {selectedGoogleAccount.email}
                      </ThemedText>
                    </View>
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#38b86b"
                    />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.secondary}
                  onPress={chooseGoogleAccount}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons
                      name="swap-horizontal-outline"
                      size={21}
                      color={theme.buttonPrimary}
                    />
                    <ThemedText
                      type="button"
                      style={{ color: theme.buttonPrimary }}
                    >
                      {selectedGoogleAccount
                        ? 'Cambiar cuenta de Google'
                        : 'Elegir cuenta de Google'}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primary}
                  onPress={connectGoogle}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="logo-google" size={21} color="white" />
                    <ThemedText type="button" style={styles.white}>
                      {selectedGoogleAccount
                        ? 'Crear un negocio nuevo'
                        : 'Continuar con Google'}
                    </ThemedText>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondary}
                  onPress={recoverBusinesses}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons
                      name="cloud-download-outline"
                      size={21}
                      color={theme.buttonPrimary}
                    />
                    <ThemedText
                      type="button"
                      style={{ color: theme.buttonPrimary }}
                    >
                      Recuperar un negocio existente
                    </ThemedText>
                  </View>
                </TouchableOpacity>
                <ThemedText style={[styles.description, styles.subtle]}>
                  LaUveTickets no guarda tu contraseña de Google.
                </ThemedText>

                <View style={styles.advanced}>
                  <TouchableOpacity
                    style={styles.advancedToggle}
                    onPress={() => setAdvancedOpen(value => !value)}
                  >
                    <ThemedText style={styles.subtle}>
                      Opciones de soporte
                    </ThemedText>
                    <Ionicons
                      name={advancedOpen ? 'chevron-up' : 'chevron-down'}
                      size={15}
                      color={theme.placeholder}
                    />
                  </TouchableOpacity>
                  {advancedOpen && (
                    <>
                      <TextInput
                        style={[styles.input, styles.jsonInput]}
                        value={configText}
                        onChangeText={setConfigText}
                        placeholder="Pegar configuración proporcionada por soporte"
                        placeholderTextColor={theme.placeholder}
                        multiline
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.primary}
                        onPress={connectAdvanced}
                      >
                        <ThemedText type="button" style={styles.white}>
                          Conectar configuración
                        </ThemedText>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </>
            )}

            {step === 'recovering' && (
              <>
                <ActivityIndicator
                  style={styles.progressRing}
                  size="large"
                  color={theme.buttonPrimary}
                />
                <ThemedText type="title" style={styles.title}>
                  Buscando tus negocios
                </ThemedText>
                <ThemedText style={styles.description}>
                  Revisando los proyectos de LaUveTickets de tu cuenta de Google…
                </ThemedText>
              </>
            )}

            {step === 'projects' && (
              <>
                <ThemedText type="title" style={styles.title}>
                  Elige tu negocio
                </ThemedText>
                <ThemedText style={styles.description}>
                  Encontramos estos espacios de LaUveTickets en tu cuenta.
                </ThemedText>
                {error && <ThemedText style={styles.error}>{error}</ThemedText>}
                <View style={styles.projectList}>
                  {recoverableProjects.length === 0 ? (
                    <ThemedText style={styles.description}>
                      No hemos encontrado ningún negocio recuperable con esta
                      cuenta de Google.
                    </ThemedText>
                  ) : (
                    recoverableProjects.map(project => (
                      <TouchableOpacity
                        key={project.projectId}
                        style={styles.projectCard}
                        onPress={() => restoreProject(project)}
                      >
                        <Ionicons
                          name="storefront-outline"
                          size={26}
                          color={theme.buttonPrimary}
                        />
                        <View style={styles.projectName}>
                          <ThemedText type="subtitle">
                            {project.displayName}
                          </ThemedText>
                          <ThemedText style={styles.subtle}>
                            {project.projectId}
                          </ThemedText>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={22}
                          color={theme.placeholder}
                        />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
                <TouchableOpacity
                  style={styles.back}
                  onPress={() => {
                    setError(null);
                    setStep('welcome');
                  }}
                >
                  <ThemedText style={styles.backText}>Volver</ThemedText>
                </TouchableOpacity>
              </>
            )}

            {step === 'business' && (
              <>
                <ThemedText type="title" style={styles.title}>
                  ¿Cómo se llama tu negocio?
                </ThemedText>
                <ThemedText style={styles.description}>
                  Puedes usar el nombre de tu empresa, atracción o puesto.
                </ThemedText>
                <TextInput
                  style={styles.input}
                  value={businessName}
                  onChangeText={value => {
                    setBusinessName(value);
                    setError(null);
                  }}
                  placeholder="Ej. Atracciones Machado"
                  placeholderTextColor={theme.placeholder}
                  autoFocus
                  maxLength={80}
                />
                {error && <ThemedText style={styles.error}>{error}</ThemedText>}
                <TouchableOpacity style={styles.primary} onPress={createBusiness}>
                  <ThemedText type="button" style={styles.white}>
                    Crear mi negocio
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.back}
                  onPress={() => setStep('welcome')}
                >
                  <ThemedText style={styles.backText}>
                    Usar otra cuenta de Google
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}

            {step === 'firebaseActivation' && (
              <>
                <ThemedText type="title" style={styles.title}>
                  Activa Firebase por primera vez
                </ThemedText>
                <ThemedText style={styles.description}>
                  Esta cuenta de Google todavía no ha utilizado Firebase.
                  Google necesita que completes esta activación una sola vez.
                  LaUveTickets ya ha creado el proyecto por ti.
                </ThemedText>
                {[
                  'Pulsa “Abrir Firebase” con la misma cuenta de Google.',
                  'Pulsa la tarjeta “Para comenzar, configura un proyecto de Firebase”.',
                  'Acepta las condiciones de Firebase.',
                  'Abajo, pulsa “¿Ya tienes un proyecto de Google Cloud? Agregar Firebase al proyecto de Google Cloud”.',
                  `Selecciona “LaUveTickets - ${pendingFirebaseProject?.businessName}” y pulsa “Continuar”.`,
                  'Continúa la configuración. Selecciona España, acepta las condiciones y pulsa “Agregar Firebase”.',
                  'Cuando termine, vuelve a LaUveTickets y pulsa el botón de continuar.',
                ].map((text, index) => (
                  <View style={styles.benefit} key={text}>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.buttonPrimary,
                      }}
                    >
                      <ThemedText style={styles.white}>{index + 1}</ThemedText>
                    </View>
                    <ThemedText style={styles.benefitText}>{text}</ThemedText>
                  </View>
                ))}
                <ThemedText style={[styles.description, styles.subtle]}>
                  Importante: no escribas el nombre de un proyecto nuevo. Usa
                  el enlace “Agregar Firebase al proyecto de Google Cloud” y
                  selecciona el proyecto con identificador
                  “{pendingFirebaseProject?.projectId}”. No necesitas añadir
                  una tarjeta.
                </ThemedText>
                <TouchableOpacity
                  style={styles.primary}
                  onPress={openFirebaseActivation}
                >
                  <ThemedText type="button" style={styles.white}>
                    Abrir Firebase
                  </ThemedText>
                </TouchableOpacity>
                {error && <ThemedText style={styles.error}>{error}</ThemedText>}
                <TouchableOpacity
                  style={styles.secondary}
                  onPress={continueAfterFirebaseActivation}
                >
                  <ThemedText
                    type="button"
                    style={{ color: theme.buttonPrimary }}
                  >
                    Ya he terminado, continuar
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}

            {step === 'authentication' && (
              <>
                <ThemedText type="title" style={styles.title}>
                  Activa los usuarios gratis
                </ThemedText>
                <ThemedText style={styles.description}>
                  Google exige confirmar este paso una sola vez para este
                  negocio. No necesitas añadir una tarjeta.
                </ThemedText>
                {[
                  'Pulsa “Abrir Firebase” y, si aparece, pulsa “Comenzar” en Authentication.',
                  'Entra en la pestaña “Método de acceso” y pulsa “Agregar un proveedor nuevo”.',
                  'Selecciona “Google”, activa el interruptor “Habilitar” y elige un correo de asistencia.',
                  'Pulsa “Guardar”, vuelve a LaUveTickets y continúa.',
                ].map((text, index) => (
                  <View style={styles.benefit} key={text}>
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.buttonPrimary,
                      }}
                    >
                      <ThemedText style={styles.white}>{index + 1}</ThemedText>
                    </View>
                    <ThemedText style={styles.benefitText}>{text}</ThemedText>
                  </View>
                ))}
                <TouchableOpacity
                  style={styles.primary}
                  onPress={openAuthenticationSetup}
                >
                  <ThemedText type="button" style={styles.white}>
                    Abrir Firebase
                  </ThemedText>
                </TouchableOpacity>
                {error && <ThemedText style={styles.error}>{error}</ThemedText>}
                <TouchableOpacity
                  style={styles.primary}
                  onPress={continueAfterAuthentication}
                >
                  <ThemedText type="button" style={styles.white}>
                    Ya he habilitado Google
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}

            {step === 'creating' && (
              <>
                <ActivityIndicator
                  style={styles.progressRing}
                  size="large"
                  color={theme.buttonPrimary}
                />
                <ThemedText type="title" style={styles.title}>
                  Preparando {businessName}
                </ThemedText>
                <ThemedText style={styles.description}>{progress}</ThemedText>
                <ThemedText style={[styles.description, styles.subtle]}>
                  Puede tardar unos minutos. No cierres la aplicación.
                </ThemedText>
              </>
            )}
          </ThemedView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
