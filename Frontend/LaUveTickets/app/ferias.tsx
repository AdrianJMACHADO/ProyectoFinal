import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NavigationHeader } from '../components/NavigationHeader';
import { useAuth } from '../contexts/AuthContext';

// Tipos
interface Feria {
  idFeria: number;
  nombre: string;
  fecha: string;
}

const FERIAS_API = 'http://va-server.duckdns.org:3000/api/feria';

const FeriasScreen: React.FC = () => {
  const navigation = useNavigation();
  const { logout } = useAuth();

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
      console.error('Error al cargar los datos:', e);
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
    <View style={styles.feriaItem}>
      <View style={{ flex: 1 }}>
        <Text style={styles.feriaTitle}>{item.nombre}</Text>
        <Text style={styles.feriaField}>ID: {item.idFeria}</Text>
        <Text style={styles.feriaField}>Fecha: {item.fecha}</Text>
      </View>
      <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
        <Text style={styles.editButtonText}>Editar</Text>
      </TouchableOpacity>
    </View>
  );

  // Filtrar ferias por año seleccionado
  const filteredFerias = selectedYear === 'Todas las fechas'
    ? ferias
    : selectedYear
    ? ferias.filter(feria => new Date(feria.fecha).getFullYear().toString() === selectedYear)
    : ferias;

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="cloud-offline" size={50} color="#FF3B30" />
        <Text style={styles.errorTextCentered}>Error al cargar las ferias: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadFerias}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationHeader 
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
      />

      <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
        <Text style={styles.createButtonText}>+ Nueva Feria</Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      ) : (
        filteredFerias.length > 0 ? (
          <FlatList
            data={filteredFerias}
            keyExtractor={(item) => item.idFeria.toString()}
            renderItem={renderFeria}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay ferias disponibles para este año.</Text>
          </View>
        )
      )}
      {/* Modal de creación/edición */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { setModalVisible(false); setModalError(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editMode ? 'Editar Feria' : 'Nueva Feria'}</Text>
            <TextInput
              style={[styles.input, formErrors.nombre && styles.inputError]}
              placeholder="Nombre"
              value={form.nombre}
              onChangeText={(text) => setForm((f) => ({ ...f, nombre: text }))}
            />
            {formErrors.nombre && <Text style={styles.errorText}>{formErrors.nombre}</Text>}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fecha</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={form.fecha ? format(new Date(form.fecha), 'yyyy-MM-dd') : ''}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, fecha: e.target.value }));
                  }}
                  style={{ ...styles.input as any, paddingVertical: 10, paddingHorizontal: 10, height: 44, color: form.fecha ? '#222' : '#aaa'}}
                />
              ) : (
                <TouchableOpacity
                  style={[styles.input, formErrors.fecha && styles.inputError]}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: form.fecha ? '#222' : '#aaa' }}>
                    {form.fecha ? format(new Date(form.fecha), 'dd/MM/yyyy') : 'Selecciona una fecha'}
                  </Text>
                </TouchableOpacity>
              )}
              {showDatePicker && Platform.OS !== 'web' && (
                <DateTimePicker
                  value={form.fecha ? new Date(form.fecha) : new Date()}
                  mode="date"
                  display="default"
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) setForm((f) => ({ ...f, fecha: format(date, 'yyyy-MM-dd') }));
                  }}
                />
              )}
              {formErrors.fecha && <Text style={styles.errorText}>{formErrors.fecha}</Text>}
            </View>
            {modalError && <Text style={styles.modalSaveErrorText}>{modalError}</Text>}
            <View style={styles.modalButtons}>
              {loading ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <TouchableOpacity style={styles.saveButton} onPress={async () => {
                    const success = await saveFeria();
                    if (success) {
                      setModalVisible(false);
                      setModalError(null);
                    }
                  }}>
                  <Text style={styles.saveButtonText}>{editMode ? 'Guardar Cambios' : 'Crear'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setModalVisible(false); setModalError(null); }} disabled={loading}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  headerContainer: {},
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#222',
    alignSelf: 'center',
  },
  createButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  feriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  feriaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  feriaField: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  editButton: {
    backgroundColor: '#FFA500',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginLeft: 10,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#222',
    alignSelf: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#F5F5F5',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 8,
    fontSize: 13,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#ccc',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bottomButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
  },
  bottomButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTextCentered: {
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalSaveErrorText: {
      color: '#ff3b30',
      textAlign: 'center',
      marginBottom: 10,
      fontSize: 14,
  },
  retryButton: {
      backgroundColor: '#007AFF',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
  },
  retryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
  },
});

export default FeriasScreen; 