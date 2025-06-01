import { useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

// Tipos
interface Feria {
  idFeria: number;
  nombre: string;
  fecha: string;
}

const FERIAS_API = 'http://va-server.duckdns.org:3000/ferias';

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

  // Cargar ferias
  const loadFerias = async () => {
    setLoading(true);
    try {
      const res = await fetch(FERIAS_API);
      const data = await res.json();
      setFerias(data);
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar las ferias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFerias();
  }, []);

  // Validación
  const validate = () => {
    const errors: { nombre?: string; fecha?: string } = {};
    if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!form.fecha.trim()) errors.fecha = 'La fecha es obligatoria';
    // Validación simple de fecha (YYYY-MM-DD)
    if (form.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(form.fecha)) errors.fecha = 'Formato: YYYY-MM-DD';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Abrir modal para crear
  const openCreateModal = () => {
    setEditMode(false);
    setForm({ nombre: '', fecha: '' });
    setFormErrors({});
    setModalVisible(true);
  };

  // Abrir modal para editar
  const openEditModal = (feria: Feria) => {
    setEditMode(true);
    setSelectedFeria(feria);
    setForm({ nombre: feria.nombre, fecha: feria.fecha });
    setFormErrors({});
    setModalVisible(true);
  };

  // Guardar feria (crear o editar)
  const saveFeria = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (editMode && selectedFeria) {
        // Editar
        const res = await fetch(`${FERIAS_API}/${selectedFeria.idFeria}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error('Error al editar la feria');
      } else {
        // Crear
        const res = await fetch(FERIAS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error('Error al crear la feria');
      }
      setModalVisible(false);
      loadFerias();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Ferias</Text>
      <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
        <Text style={styles.createButtonText}>+ Nueva Feria</Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={ferias}
          keyExtractor={(item) => item.idFeria.toString()}
          renderItem={renderFeria}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
      {/* Modal de creación/edición */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
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
            <TextInput
              style={[styles.input, formErrors.fecha && styles.inputError]}
              placeholder="Fecha (YYYY-MM-DD)"
              value={form.fecha}
              onChangeText={(text) => setForm((f) => ({ ...f, fecha: text }))}
            />
            {formErrors.fecha && <Text style={styles.errorText}>{formErrors.fecha}</Text>}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.saveButton} onPress={saveFeria}>
                <Text style={styles.saveButtonText}>{editMode ? 'Guardar Cambios' : 'Crear'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Navegación */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomButton} onPress={() => navigation.goBack()}>
          <Text style={styles.bottomButtonText}>Volver a Tickets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomButton} onPress={logout}>
          <Text style={styles.bottomButtonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    paddingTop: 50,
    paddingHorizontal: 16,
  },
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
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
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
});

export default FeriasScreen; 