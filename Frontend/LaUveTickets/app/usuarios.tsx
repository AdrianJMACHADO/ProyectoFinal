import { NavigationHeader } from '@/components/NavigationHeader';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';
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
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const emptyForm: CreateManagedUserInput = {
  nombre: '',
  email: '',
  password: '',
  role: 'EMPLEADO',
};

export default function UsersScreen() {
  const { role, user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<CreateManagedUserInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const theme = useTheme();

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
    if (!form.nombre.trim() || !form.email.trim() || form.password.length < 8) {
      setError('Completa los campos y usa una contraseña de al menos 8 caracteres');
      return;
    }

    setSaving(true);
    try {
      await createManagedUser(form);
      setModalVisible(false);
      setForm(emptyForm);
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
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <NavigationHeader />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <ThemedText type="title">Usuarios</ThemedText>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="person-add" size={19} color="white" />
            <ThemedText type="button" style={styles.white}>Crear</ThemedText>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={theme.buttonPrimary} />
        ) : (
          <FlatList
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
              style={styles.input}
              value={form.nombre}
              onChangeText={nombre => setForm(current => ({ ...current, nombre }))}
              placeholder="Nombre"
              placeholderTextColor={theme.placeholder}
            />
            <TextInput
              style={styles.input}
              value={form.email}
              onChangeText={email => setForm(current => ({ ...current, email }))}
              placeholder="Correo electrónico"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              value={form.password}
              onChangeText={password => setForm(current => ({ ...current, password }))}
              placeholder="Contraseña temporal"
              placeholderTextColor={theme.placeholder}
              secureTextEntry
            />
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
    </SafeAreaView>
  );
}
