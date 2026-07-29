import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { NavigationActionsRegistration } from '../components/NavigationActionsRegistration';
import { NavigationHeaderRegistration } from '../components/NavigationHeaderRegistration';
import { useAuth } from '../contexts/AuthContext';
import { useNavigationChrome } from '../contexts/NavigationChromeContext';
import {
  createFeria,
  listFerias,
  subscribeFerias,
  updateFeria,
} from '../services/firestoreData';

// Caracteres especiales a filtrar de los inputs (para seguridad)
const inputFilterRegex = /[;"'=\\<>]/g;

// Tipos
interface Feria {
  idFeria: number;
  nombre: string;
  fecha: string;
  estado?: 'ACTIVO' | 'INACTIVO';
}

const FeriasScreen: React.FC = () => {
  const { reportScroll } = useNavigationChrome();
  const router = useRouter();
  const { logout } = useAuth();
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 600;

  const [ferias, setFerias] = useState<Feria[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [selectedFeria, setSelectedFeria] = useState<Feria | null>(null);
  const [form, setForm] = useState<{ nombre: string; fecha: string }>({ nombre: '', fecha: '' });
  const [formErrors, setFormErrors] = useState<{ nombre?: string; fecha?: string }>({});
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Hook para obtener las áreas seguras

  // Cargar ferias
  const loadFerias = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listFerias();
      setFerias(data);
      const years: string[] = Array.from(new Set(data.map((feria: Feria) => new Date(feria.fecha).getFullYear().toString())));
      years.sort((a, b) => parseInt(b) - parseInt(a));
      setAvailableYears(['Todas las fechas', ...years]);
      const currentYear = String(new Date().getFullYear());
      setSelectedYear(current =>
        current && ['Todas las fechas', ...years].includes(current)
          ? current
          : years.includes(currentYear)
            ? currentYear
            : 'Todas las fechas',
      );
      setError(null);
    } catch (e) {
      // console.error('Error al cargar los datos:', e);
      const errorMessage = (e as Error).message || 'No se pudieron cargar las ferias.';
      setError(errorMessage);
      Alert.alert('Error de Carga', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeFerias(
      data => {
        setFerias(data);
        const years = Array.from(
          new Set(
            data.map(feria =>
              new Date(feria.fecha).getFullYear().toString(),
            ),
          ),
        ).sort((a, b) => Number(b) - Number(a));
        const yearOptions = ['Todas las fechas', ...years];
        setAvailableYears(yearOptions);
        setSelectedYear(current =>
          current && yearOptions.includes(current)
            ? current
            : years.includes(String(new Date().getFullYear()))
              ? String(new Date().getFullYear())
              : 'Todas las fechas',
        );
        setError(null);
        setLoading(false);
      },
      subscriptionError => {
        setError(
          subscriptionError.message || 'No se pudieron sincronizar las ferias.',
        );
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  // Handler para el cambio de año desde NavigationHeader
  const handleYearChange = (year: string | null) => {
    setSelectedYear(year);
  };

  // Validación
  const validate = () => {
    const errors: { nombre?: string; fecha?: string } = {};
    if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!form.fecha.trim()) errors.fecha = 'La fecha es obligatoria';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Abrir modal para crear
  const openCreateModal = () => {
    setEditMode(false);
    const today = new Date();
    setForm({ nombre: '', fecha: today.toISOString() });
    setPendingDate(today);
    setFormErrors({});
    setModalError(null);
    setModalVisible(true);
  };

  // Abrir modal para editar
  const openEditModal = (feria: Feria) => {
    setEditMode(true);
    setSelectedFeria(feria);
    setForm({ nombre: feria.nombre, fecha: feria.fecha });
    setFormErrors({});
    setModalError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setShowDatePicker(false);
    setModalVisible(false);
    setModalError(null);
  };

  const openDatePicker = () => {
    setPendingDate(form.fecha ? new Date(form.fecha) : new Date());
    setShowDatePicker(true);
  };

  const commitDate = (date: Date) => {
    setForm((current) => ({ ...current, fecha: date.toISOString() }));
    setFormErrors((current) => ({ ...current, fecha: undefined }));
  };

  // Guardar feria (crear o editar)
  const saveFeria = async () => {
    if (!validate()) {
        setModalError('Por favor, complete los campos obligatorios.');
        return false;
    }
    setLoading(true);
    setModalError(null);
    try {
      if (editMode && selectedFeria) {
        await updateFeria(selectedFeria.idFeria, form);
      } else {
        await createFeria(form);
      }

      Alert.alert('Éxito', `${editMode ? 'Feria actualizada' : 'Feria creada'} correctamente`);
      return true;

    } catch (e) {
      console.error('Fetch Error:', e);
      const errorMessage = (e as Error).message || `No se pudo ${editMode ? 'editar' : 'crear'} la feria`;
      setModalError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleFeriaEstado = async (feria: Feria) => {
    const nextEstado =
      (feria.estado ?? 'ACTIVO') === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      await updateFeria(feria.idFeria, { estado: nextEstado });
    } catch (stateError) {
      Alert.alert(
        'Error',
        (stateError as Error).message ||
          `No se pudo ${nextEstado === 'ACTIVO' ? 'activar' : 'inactivar'} la feria`,
      );
    }
  };

  // Renderizar feria
  const renderFeria = ({ item }: { item: Feria }) => {
    const isActive = (item.estado ?? 'ACTIVO') === 'ACTIVO';
    return (
    <ThemedView
      type="card"
      style={[
        styles.feriaItem,
        {
          borderLeftColor: isActive ? theme.success : theme.error,
          opacity: isActive ? 1 : 0.72,
        },
      ]}
    >
      <View style={styles.feriaContent}>
        <View style={styles.feriaInfo}>
          <ThemedText type="title" style={styles.feriaTitle}>{item.nombre}</ThemedText>
          <ThemedText style={styles.feriaDate}>
            {format(new Date(item.fecha), 'dd/MM/yyyy')}
          </ThemedText>
          <ThemedText
            style={[
              styles.feriaEstado,
              { color: isActive ? theme.success : theme.error },
            ]}
          >
            {isActive ? 'ACTIVA' : 'INACTIVA'}
          </ThemedText>
        </View>
        <View style={styles.feriaActions}>
          <TouchableOpacity
            style={[styles.stateButton, { backgroundColor: isActive ? theme.error : theme.success }]}
            onPress={() => toggleFeriaEstado(item)}
          >
            <Ionicons
              name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
              size={19}
              color="white"
            />
            <ThemedText type="button" style={styles.editButtonText}>
              {isActive ? 'Inactivar' : 'Activar'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: theme.buttonPrimary }]}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="pencil" size={20} color="white" />
            <ThemedText type="button" style={styles.editButtonText}>Editar</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
    );
  };

  // Filtrar ferias por año y término de búsqueda
  const filteredFerias = ferias.filter(feria => {
    const matchesSearch = searchQuery.toLowerCase() === '' || 
      feria.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = selectedYear === 'Todas las fechas' || 
      new Date(feria.fecha).getFullYear().toString() === selectedYear;
    return matchesSearch && matchesYear;
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    searchContainer: {
      flexDirection: 'row',
      padding: 16,
      gap: 16,
      alignItems: 'center',
    },
    searchInput: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderRadius: 20,
      paddingHorizontal: 15,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 8,
      gap: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorTextCentered: {
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 20,
    },
    retryButton: {
      padding: 15,
      borderRadius: 8,
      minWidth: 120,
      alignItems: 'center',
    },
    listContainer: {
      padding: 16,
      paddingBottom: 116,
    },
    feriaItem: {
      marginBottom: 16,
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      elevation: 3,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    feriaContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    feriaInfo: {
      flex: 1,
      marginRight: 16,
    },
    feriaTitle: {
      marginBottom: 4,
    },
    feriaDate: {
      fontSize: 14,
      opacity: 0.7,
    },
    feriaEstado: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '800',
    },
    feriaActions: {
      gap: 8,
    },
    stateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      borderRadius: 8,
      gap: 6,
      minWidth: 120,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      gap: 8,
      minWidth: 120,
    },
    editButtonText: {
      color: 'white',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 480,
      borderRadius: 20,
      padding: 22,
      elevation: 8,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    modalTitle: {
      marginBottom: 20,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    inputError: {
      borderColor: '#FF3B30',
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      marginBottom: 8,
    },
    errorText: {
      color: '#FF3B30',
      marginBottom: 16,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    modalButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 4,
      elevation: 3,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    buttonText: {
      color: 'white',
    },
    dateButton: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 0,
    },
    datePickerCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 20,
      padding: 20,
    },
    datePickerActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 12,
    },
    datePickerAction: {
      minWidth: 108,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
  });

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={50} color={theme.error} />
          <ThemedText type="subtitle" style={styles.errorTextCentered}>
            Error al cargar las ferias: {error}
          </ThemedText>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.buttonPrimary }]} 
            onPress={loadFerias}
          >
            <ThemedText type="button" style={styles.buttonText}>Reintentar</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <NavigationHeaderRegistration
        tab="Ferias"
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
      />
      <NavigationActionsRegistration
        tab="Ferias"
        onCreate={isMobile ? openCreateModal : undefined}
      />

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { 
              backgroundColor: theme.inputBackground,
              borderColor: theme.border,
              color: theme.text
            }]}
            placeholder="Buscar ferias..."
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {!isMobile && (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: '#FFC107' }]}
              onPress={openCreateModal}
            >
              <Ionicons name="add" size={20} color="white" />
              <ThemedText type="button" style={styles.buttonText}>Nueva Feria</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.buttonPrimary} />
          </View>
        ) : filteredFerias.length > 0 ? (
          <FlatList
            onScroll={(event) =>
              reportScroll('Ferias', event.nativeEvent.contentOffset.y)
            }
            scrollEventThrottle={16}
            data={filteredFerias}
            keyExtractor={(item) => item.idFeria.toString()}
            renderItem={renderFeria}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText type="subtitle" style={styles.emptyText}>
              No hay ferias disponibles para este año.
            </ThemedText>
          </View>
        )}

      </View>

      {/* Modal de creación/edición */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={closeModal}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.62)' }]}
          onPress={closeModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <Pressable style={{ width: '100%', alignItems: 'center' }} onPress={(event) => event.stopPropagation()}>
              <ThemedView type="card" style={styles.modalContent}>
              <ThemedText type="title" style={styles.modalTitle}>
                {editMode ? 'Editar Feria' : 'Nueva Feria'}
              </ThemedText>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBackground,
                    borderColor: formErrors.nombre ? theme.error : theme.border,
                    color: theme.text
                  }
                ]}
                placeholder="Nombre"
                placeholderTextColor={theme.placeholder}
                value={form.nombre}
                onChangeText={(text) => setForm((f) => ({ ...f, nombre: text.replace(inputFilterRegex, '') }))}
              />
              {formErrors.nombre && (
                <ThemedText style={[styles.errorText, { color: theme.error }]}>
                  {formErrors.nombre}
                </ThemedText>
              )}

              <View style={styles.inputGroup}>
                <ThemedText style={styles.label}>Fecha</ThemedText>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={form.fecha ? format(new Date(form.fecha), 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, fecha: e.target.value }));
                    }}
                    style={{
                      ...styles.input as any,
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      height: 44,
                      color: form.fecha ? theme.text : theme.placeholder,
                      backgroundColor: theme.inputBackground,
                      borderColor: formErrors.fecha ? theme.error : theme.border,
                    }}
                  />
                ) : Platform.OS === 'ios' ? (
                  <View
                    style={[
                      styles.input,
                      styles.dateButton,
                      {
                        backgroundColor: theme.inputBackground,
                        borderColor: formErrors.fecha ? theme.error : theme.border,
                      },
                    ]}
                  >
                    <ThemedText>Fecha de la feria</ThemedText>
                    <DateTimePicker
                      value={form.fecha ? new Date(form.fecha) : new Date()}
                      mode="date"
                      display="compact"
                      locale="es-ES"
                      onChange={(_, selectedDate) => {
                        if (selectedDate) commitDate(selectedDate);
                      }}
                    />
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.input,
                      styles.dateButton,
                      {
                        backgroundColor: theme.inputBackground,
                        borderColor: formErrors.fecha ? theme.error : theme.border,
                      }
                    ]}
                    onPress={openDatePicker}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={form.fecha ? {} : { color: theme.placeholder }}>
                      {form.fecha ? format(new Date(form.fecha), 'dd/MM/yyyy') : 'Seleccionar fecha'}
                    </ThemedText>
                    <Ionicons name="calendar-outline" size={22} color={form.fecha ? theme.primary : theme.placeholder} />
                  </TouchableOpacity>
                )}
              </View>
              {formErrors.fecha && (
                <ThemedText style={[styles.errorText, { color: theme.error }]}>
                  {formErrors.fecha}
                </ThemedText>
              )}

              {modalError && (
                <ThemedText style={[styles.errorText, { color: theme.error }]}>
                  {modalError}
                </ThemedText>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
                  onPress={async () => {
                    const success = await saveFeria();
                    if (success) {
                      closeModal();
                    }
                  }}
                >
                  <ThemedText type="button" style={styles.buttonText}>
                    {editMode ? 'Guardar' : 'Crear'}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.error }]}
                  onPress={() => {
                    closeModal();
                  }}
                >
                  <ThemedText type="button" style={styles.buttonText}>Cancelar</ThemedText>
                </TouchableOpacity>
              </View>
              </ThemedView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={pendingDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (event.type !== 'dismissed' && selectedDate) {
              commitDate(selectedDate);
            }
          }}
        />
      )}

    </SafeAreaView>
  );
};

export default FeriasScreen;
