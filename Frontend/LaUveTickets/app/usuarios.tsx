import { NavigationHeaderRegistration } from '@/components/NavigationHeaderRegistration';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigationChrome } from '@/contexts/NavigationChromeContext';
import { useTheme } from '@/hooks/useThemeColor';
import {
  CreateManagedUserInput,
  UserProfile,
  createManagedUser,
  listUserProfiles,
  setUserEnabled,
  updateUserRole,
} from '@/services/userProfiles';
import { Ionicons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { NavigationActionsRegistration } from '../components/NavigationActionsRegistration';

const emptyForm: CreateManagedUserInput = {
  nombre: '',
  email: '',
  password: '',
  role: 'EMPLEADO',
};

export default function UsersScreen() {
  const { reportScroll } = useNavigationChrome();
  const { role, user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<CreateManagedUserInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    nombre?: string;
    email?: string;
    password?: string;
  }>({});
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 600;

  const openCreateModal = () => {
    setError(null);
    setFieldErrors({});
    setModalVisible(true);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      setUsers(await listUserProfiles());
    } catch (loadError) {
      Alert.alert('Error', (loadError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role === 'ADMIN' || role === 'SUPERADMIN') loadUsers();
  }, [role]);

  if (role === 'EMPLEADO') return <Redirect href="/tickets" />;

  const createUser = async () => {
    setError(null);
    const validationErrors: typeof fieldErrors = {};
    if (!form.nombre.trim()) {
      validationErrors.nombre = 'El nombre es obligatorio.';
    }
    if (!form.email.trim()) {
      validationErrors.email = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      validationErrors.email = 'Escribe un correo electrónico válido.';
    }
    if (!form.password) {
      validationErrors.password = 'La contraseña temporal es obligatoria.';
    } else if (form.password.length < 8) {
      validationErrors.password = 'Debe tener al menos 8 caracteres.';
    }
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    if (!form.nombre.trim() || !form.email.trim() || form.password.length < 8) {
      setError('Completa los campos y usa una contraseña de al menos 8 caracteres');
      return;
    }

    setSaving(true);
    try {
      await createManagedUser(form);
      setModalVisible(false);
      setForm(emptyForm);
      setFieldErrors({});
      await loadUsers();
    } catch (createError: any) {
      setError(createError?.message || 'No se pudo crear el usuario');
    } finally {
      setSaving(false);
    }
  };

  const toggleUser = async (item: UserProfile) => {
    if (item.role === 'SUPERADMIN') return;
    await setUserEnabled(item.uid, !item.activo);
    await loadUsers();
  };

  const toggleRole = async (item: UserProfile) => {
    if (item.role === 'SUPERADMIN') return;
    await updateUserRole(
      item.uid,
      item.role === 'ADMIN' ? 'EMPLEADO' : 'ADMIN',
    );
    await loadUsers();
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { flex: 1, padding: 16 },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.buttonPrimary,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    card: {
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    userHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    identityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    youBadge: {
      paddingHorizontal: 9,
      paddingVertical: 3,
      borderRadius: 10,
      backgroundColor: `${theme.buttonPrimary}25`,
      borderWidth: 1,
      borderColor: theme.buttonPrimary,
    },
    email: { opacity: 0.7, marginTop: 3 },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    action: {
      flex: 1,
      alignItems: 'center',
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalCard: {
      width: '100%',
      maxWidth: 500,
      alignSelf: 'center',
      padding: 20,
      borderRadius: 16,
      gap: 12,
    },
    input: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.inputBackground,
      color: theme.text,
      borderRadius: 9,
      paddingHorizontal: 12,
    },
    inputError: {
      borderColor: theme.error,
      borderWidth: 2,
    },
    fieldError: {
      color: theme.error,
      fontSize: 13,
      marginTop: -7,
    },
    roleRow: { flexDirection: 'row', gap: 10 },
    roleButton: {
      flex: 1,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 9,
    },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 6 },
    modalButton: {
      flex: 1,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
    },
    white: { color: 'white' },
    error: { color: theme.error, textAlign: 'center' },
  });

  return (
    <View style={styles.container}>
      <NavigationHeaderRegistration tab="Usuarios" />
      <NavigationActionsRegistration
        tab="Usuarios"
        onCreate={isMobile ? openCreateModal : undefined}
      />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <ThemedText type="title">Usuarios</ThemedText>
          {!isMobile && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={openCreateModal}
            >
              <Ionicons name="person-add" size={19} color="white" />
              <ThemedText type="button" style={styles.white}>Crear</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.buttonPrimary} />
        ) : (
          <FlatList
            onScroll={event =>
              reportScroll('Usuarios', event.nativeEvent.contentOffset.y)
            }
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingBottom: 116 }}
            data={users}
            keyExtractor={item => item.uid}
            renderItem={({ item }) => (
              <ThemedView type="card" style={styles.card}>
                <View style={styles.userHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.identityRow}>
                      <ThemedText type="subtitle">{item.nombre}</ThemedText>
                      {item.uid === user?.uid && (
                        <View style={styles.youBadge}>
                          <ThemedText
                            style={{
                              color: theme.buttonPrimary,
                              fontWeight: '800',
                              fontSize: 11,
                            }}
                          >
                            TÚ
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText style={styles.email}>{item.email}</ThemedText>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: item.activo
                          ? `${theme.success}30`
                          : `${theme.error}30`,
                      },
                    ]}
                  >
                    <ThemedText style={{ fontWeight: '700' }}>
                      {item.role}
                    </ThemedText>
                  </View>
                </View>

                {item.role !== 'SUPERADMIN' && (
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.action} onPress={() => toggleRole(item)}>
                      <ThemedText>
                        Hacer {item.role === 'ADMIN' ? 'empleado' : 'admin'}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.action} onPress={() => toggleUser(item)}>
                      <ThemedText style={{ color: item.activo ? theme.error : theme.success }}>
                        {item.activo ? 'Desactivar' : 'Activar'}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                )}
              </ThemedView>
            )}
          />
        )}
      </View>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <ThemedView type="card" style={styles.modalCard}>
            <ThemedText type="subtitle">Crear usuario</ThemedText>
            <TextInput
              style={[styles.input, fieldErrors.nombre && styles.inputError]}
              value={form.nombre}
              onChangeText={nombre => {
                setForm(current => ({ ...current, nombre }));
                setFieldErrors(current => ({ ...current, nombre: undefined }));
              }}
              placeholder="Nombre"
              placeholderTextColor={theme.placeholder}
            />
            {fieldErrors.nombre && (
              <ThemedText style={styles.fieldError}>
                {fieldErrors.nombre}
              </ThemedText>
            )}
            <TextInput
              style={[styles.input, fieldErrors.email && styles.inputError]}
              value={form.email}
              onChangeText={email => {
                setForm(current => ({ ...current, email }));
                setFieldErrors(current => ({ ...current, email: undefined }));
              }}
              placeholder="Correo electrónico"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {fieldErrors.email && (
              <ThemedText style={styles.fieldError}>
                {fieldErrors.email}
              </ThemedText>
            )}
            <TextInput
              style={[styles.input, fieldErrors.password && styles.inputError]}
              value={form.password}
              onChangeText={password => {
                setForm(current => ({ ...current, password }));
                setFieldErrors(current => ({ ...current, password: undefined }));
              }}
              placeholder="Contraseña temporal"
              placeholderTextColor={theme.placeholder}
              secureTextEntry
            />
            {fieldErrors.password && (
              <ThemedText style={styles.fieldError}>
                {fieldErrors.password}
              </ThemedText>
            )}
            <View style={styles.roleRow}>
              {(['EMPLEADO', 'ADMIN'] as const).map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.roleButton,
                    form.role === option && {
                      backgroundColor: `${theme.buttonPrimary}25`,
                      borderColor: theme.buttonPrimary,
                    },
                  ]}
                  onPress={() => setForm(current => ({ ...current, role: option }))}
                >
                  <ThemedText>{option}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            {error && <ThemedText style={styles.error}>{error}</ThemedText>}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { borderWidth: 1, borderColor: theme.border }]}
                onPress={() => {
                  setModalVisible(false);
                  setError(null);
                  setFieldErrors({});
                }}
                disabled={saving}
              >
                <ThemedText>Cancelar</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.buttonPrimary }]}
                onPress={createUser}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator color="white" />
                  : <ThemedText type="button" style={styles.white}>Guardar</ThemedText>}
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </View>
  );
}
