import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
              <input
                type="date"
                value={form.fecha ? format(new Date(form.fecha), 'yyyy-MM-dd') : ''}
                onChange={(e) => {
                  setForm((f) => ({ ...f, fecha: e.target.value }));
                }}
                style={{ ...styles.input as any, paddingVertical: 10, paddingHorizontal: 10, height: 44, color: form.fecha ? '#222' : '#aaa'}}
              />
            </View>
            {formErrors.fecha && <Text style={styles.errorText}>{formErrors.fecha}</Text>}
            {modalError && <Text style={styles.errorText}>{modalError}</Text>}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setModalVisible(false); setModalError(null); }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={async () => {
                  if (await saveFeria()) {
                    setModalVisible(false);
                  }
                }}
              >
                <Text style={styles.saveButtonText}>Guardar</Text>
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
    backgroundColor: '#f5f5f5',
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
  },
  retryButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#007AFF',
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
  },
  createButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    margin: 15,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  feriaItem: {
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  feriaTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  feriaField: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  editButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 500,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 10,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  cancelButtonText: {
    color: '#333',
    textAlign: 'center',
    fontSize: 16,
  },
  saveButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default FeriasScreen; 