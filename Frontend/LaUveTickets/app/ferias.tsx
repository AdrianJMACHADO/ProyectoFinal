import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Modal, Platform, SafeAreaView, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationHeader } from '../components/NavigationHeader';
import { useAuth } from '../contexts/AuthContext';

// Caracteres especiales a filtrar de los inputs (para seguridad)
const inputFilterRegex = /[;"'=\\<>]/g;

// Tipos
interface Feria {
  idFeria: number;
  nombre: string;
  fecha: string;
}

const FERIAS_API = 'http://va-server.duckdns.org:3000/api/feria';

const FeriasScreen: React.FC = () => {
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
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Hook para obtener las áreas seguras
  const insets = useSafeAreaInsets();

  // Cargar ferias
  const loadFerias = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(FERIAS_API);
      const data = await res.json();
      if (data.ok) {
        setFerias(data.datos);
        const years: string[] = Array.from(new Set(data.datos.map((feria: Feria) => new Date(feria.fecha).getFullYear().toString())));
        years.sort((a, b) => parseInt(b) - parseInt(a));
        setAvailableYears(['Todas las fechas', ...years]);
        if (selectedYear === null && years.length > 0) {
          setSelectedYear(years[0]);
        } else {
          setSelectedYear('Todas las fechas');
        }
        setError(null);
      } else {
        const errorMessage = data.mensaje || 'Error al cargar las ferias (API)';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
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
    loadFerias();
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
    setForm({ nombre: '', fecha: '' });
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

  // Guardar feria (crear o editar)
  const saveFeria = async () => {
    if (!validate()) {
        setModalError('Por favor, complete los campos obligatorios.');
        return false;
    }
    setLoading(true);
    setModalError(null);
    try {
      const url = editMode && selectedFeria
        ? `${FERIAS_API}/${selectedFeria.idFeria}`
        : FERIAS_API;
      const method = editMode && selectedFeria ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        console.error('API Error:', data);
        const errorMessage = data.mensaje || `Error HTTP ${res.status} al ${editMode ? 'editar' : 'crear'} la feria`;
        setModalError(errorMessage);
        return false;
      }

      Alert.alert('Éxito', `${editMode ? 'Feria actualizada' : 'Feria creada'} correctamente`);
      await loadFerias();
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

  // Renderizar feria
  const renderFeria = ({ item }: { item: Feria }) => (
    <ThemedView type="card" style={styles.feriaItem}>
      <View style={styles.feriaContent}>
        <View style={styles.feriaInfo}>
          <ThemedText type="title" style={styles.feriaTitle}>{item.nombre}</ThemedText>
          <ThemedText style={styles.feriaDate}>
            {format(new Date(item.fecha), 'dd/MM/yyyy')}
          </ThemedText>
        </View>
        <TouchableOpacity 
          style={[styles.editButton, { backgroundColor: theme.buttonPrimary }]} 
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="pencil" size={20} color="white" />
          <ThemedText type="button" style={styles.editButtonText}>Editar</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );

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
    },
    feriaItem: {
      marginBottom: 16,
      borderRadius: 12,
      padding: 16,
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
    fab: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: '90%',
      maxWidth: 500,
      borderRadius: 12,
      padding: 20,
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
  });

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
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
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <NavigationHeader 
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
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
              style={[styles.createButton, { backgroundColor: theme.buttonPrimary }]}
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

        {isMobile && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.buttonPrimary }]}
            onPress={openCreateModal}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Modal de creación/edición */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { setModalVisible(false); setModalError(null); }}
      >
        <TouchableWithoutFeedback onPress={() => {
          if (Platform.OS === 'web') {
            setModalVisible(false);
            setModalError(null);
          }
        }}>
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
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
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.inputBackground,
                        borderColor: formErrors.fecha ? theme.error : theme.border,
                      }
                    ]}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={form.fecha ? {} : { color: theme.placeholder }}>
                      {form.fecha ? format(new Date(form.fecha), 'dd/MM/yyyy') : 'Seleccionar fecha'}
                    </ThemedText>
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
                  style={[styles.modalButton, { backgroundColor: theme.buttonPrimary }]}
                  onPress={async () => {
                    const success = await saveFeria();
                    if (success) {
                      setModalVisible(false);
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
                    setModalVisible(false);
                    setModalError(null);
                  }}
                >
                  <ThemedText type="button" style={styles.buttonText}>Cancelar</ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {Platform.OS !== 'web' && showDatePicker && (
        <DateTimePicker
          value={form.fecha ? new Date(form.fecha) : new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setForm((f) => ({ ...f, fecha: selectedDate.toISOString() }));
            }
          }}
        />
      )}
    </SafeAreaView>
  );
};

export default FeriasScreen; 