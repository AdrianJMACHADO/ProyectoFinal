import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

// Modelos
export type Ticket = {
  idTicket: number;
  idFeria: number | null;
  nombre: string;
  tipo: string;
  fecha_creacion?: string;
  cantidad_inicial: number;
  usos?: number;
  estado?: string;
};
export type Feria = {
  idFeria: number;
  nombre: string;
  fecha: string;
};

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ferias, setFerias] = useState<Feria[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<Ticket>>({});
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const { logout } = useAuth();
  const router = useRouter();

  // Cargar tickets y ferias
  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, feriasRes] = await Promise.all([
        fetch('http://va-server.duckdns.org:3000/api/ticket'),
        fetch('http://va-server.duckdns.org:3000/api/feria'),
      ]);
      setTickets(await ticketsRes.json());
      setFerias(await feriasRes.json());
    } catch (e) {
      Alert.alert('Error', 'No se pudieron cargar los datos');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Validación
  const validate = (data: Partial<Ticket>, isEdit = false) => {
    const errors: { [key: string]: string } = {};
    if (!data.nombre) errors.nombre = 'El nombre es obligatorio';
    if (!data.tipo) errors.tipo = 'El tipo es obligatorio';
    if (!isEdit && (!data.cantidad_inicial || data.cantidad_inicial <= 0)) errors.cantidad_inicial = 'Cantidad inicial debe ser mayor que 0';
    if (!isEdit && !data.idFeria) errors.idFeria = 'Selecciona una feria';
    return errors;
  };

  // Abrir modal para crear
  const openCreate = () => {
    setForm({ nombre: '', tipo: '', cantidad_inicial: 1, idFeria: ferias[0]?.idFeria || null });
    setEditMode(false);
    setFormErrors({});
    setModalVisible(true);
  };

  // Abrir modal para editar
  const openEdit = (ticket: Ticket) => {
    setForm({ ...ticket });
    setEditMode(true);
    setFormErrors({});
    setModalVisible(true);
  };

  // Guardar ticket (crear o editar)
  const handleSave = async () => {
    const errors = validate(form, editMode);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    try {
      if (editMode) {
        // Solo nombre, tipo, estado
        await fetch(`http://va-server.duckdns.org:3000/api/ticket/${form.idTicket}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nombre: form.nombre, tipo: form.tipo, estado: form.estado }),
        });
      } else {
        await fetch('http://va-server.duckdns.org:3000/api/ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: form.nombre,
            tipo: form.tipo,
            cantidad_inicial: form.cantidad_inicial,
            idFeria: form.idFeria,
          }),
        });
      }
      setModalVisible(false);
      loadData();
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar el ticket');
    }
  };

  // Cambiar estado
  const handleToggleEstado = async (ticket: Ticket) => {
    try {
      await fetch(`http://va-server.duckdns.org:3000/api/ticket/${ticket.idTicket}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: ticket.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' }),
      });
      loadData();
    } catch (e) {
      Alert.alert('Error', 'No se pudo cambiar el estado');
    }
  };

  // Renderizar ticket
  const renderTicket = ({ item }: { item: Ticket }) => (
    <View style={styles.ticketItem}>
      <Text style={styles.ticketTitle}>{item.nombre} ({item.tipo})</Text>
      <Text>Feria: {ferias.find(f => f.idFeria === item.idFeria)?.nombre || '-'}</Text>
      <Text>Cantidad inicial: {item.cantidad_inicial}</Text>
      <Text>Usos: {item.usos ?? 0}</Text>
      <Text>Estado: {item.estado}</Text>
      <Text>Fecha creación: {item.fecha_creacion?.slice(0, 10) || '-'}</Text>
      <View style={styles.ticketActions}>
        <Button title="Editar" onPress={() => openEdit(item)} />
        <Button
          title={item.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
          color={item.estado === 'ACTIVO' ? '#FF3B30' : '#34C759'}
          onPress={() => handleToggleEstado(item)}
        />
      </View>
    </View>
  );

  // Formulario modal
  const renderModal = () => (
    <Modal visible={modalVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{editMode ? 'Editar Ticket' : 'Crear Ticket'}</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre"
            value={form.nombre || ''}
            onChangeText={v => setForm(f => ({ ...f, nombre: v }))}
          />
          {formErrors.nombre && <Text style={styles.error}>{formErrors.nombre}</Text>}
          <TextInput
            style={styles.input}
            placeholder="Tipo"
            value={form.tipo || ''}
            onChangeText={v => setForm(f => ({ ...f, tipo: v }))}
          />
          {formErrors.tipo && <Text style={styles.error}>{formErrors.tipo}</Text>}
          {!editMode && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Cantidad inicial"
                value={form.cantidad_inicial?.toString() || ''}
                onChangeText={v => setForm(f => ({ ...f, cantidad_inicial: parseInt(v) || 0 }))}
                keyboardType="numeric"
              />
              {formErrors.cantidad_inicial && <Text style={styles.error}>{formErrors.cantidad_inicial}</Text>}
              <Text style={styles.label}>Feria:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.idFeria}
                  onValueChange={v => setForm(f => ({ ...f, idFeria: v }))}
                  style={styles.picker}
                >
                  {ferias.map(f => (
                    <Picker.Item key={f.idFeria} label={f.nombre} value={f.idFeria} />
                  ))}
                </Picker>
              </View>
              {formErrors.idFeria && <Text style={styles.error}>{formErrors.idFeria}</Text>}
            </>
          )}
          {editMode && (
            <>
              <Text style={styles.label}>Estado:</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={form.estado}
                  onValueChange={v => setForm(f => ({ ...f, estado: v }))}
                  style={styles.picker}
                >
                  <Picker.Item label="ACTIVO" value="ACTIVO" />
                  <Picker.Item label="INACTIVO" value="INACTIVO" />
                </Picker>
              </View>
            </>
          )}
          <View style={styles.modalActions}>
            <Button title="Cancelar" color="#888" onPress={() => setModalVisible(false)} />
            <Button title={editMode ? 'Guardar' : 'Crear'} onPress={handleSave} />
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tickets</Text>
        <Button title="Ver Ferias" onPress={() => router.push('/ferias')} />
        <Button title="Logout" color="#FF3B30" onPress={logout} />
      </View>
      <FlatList
        data={tickets}
        renderItem={renderTicket}
        keyExtractor={item => item.idTicket.toString()}
        style={styles.list}
      />
      <TouchableOpacity style={styles.fab} onPress={openCreate}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      {renderModal()}
    </View>
  );
}

// Picker cross-platform
import { Platform } from 'react-native';
let Picker: any;
if (Platform.OS === 'web') {
  Picker = ({ selectedValue, onValueChange, children, style }: any) => (
    <select
      value={selectedValue}
      onChange={e => onValueChange(Number(e.target.value))}
      style={{ ...style, padding: 10, borderRadius: 5, marginBottom: 10 }}
    >
      {children}
    </select>
  );
  Picker.Item = ({ label, value }: any) => <option value={value}>{label}</option>;
} else {
  Picker = require('@react-native-picker/picker').Picker;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  title: { fontSize: 24, fontWeight: 'bold' },
  list: { flex: 1 },
  ticketItem: { backgroundColor: 'white', padding: 15, marginVertical: 5, marginHorizontal: 10, borderRadius: 5, elevation: 2 },
  ticketTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  ticketActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 10 },
  fab: { position: 'absolute', right: 30, bottom: 30, backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  fabText: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, width: 320, maxWidth: '90%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  input: { backgroundColor: '#f0f0f0', padding: 10, borderRadius: 5, marginBottom: 10 },
  label: { fontWeight: 'bold', marginTop: 10 },
  pickerContainer: { backgroundColor: '#f0f0f0', borderRadius: 5, marginBottom: 10 },
  picker: { width: '100%' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  error: { color: '#FF3B30', marginBottom: 5 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
}); 