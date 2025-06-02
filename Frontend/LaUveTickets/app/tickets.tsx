import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationHeader } from '../components/NavigationHeader';
import { QRGenerator } from '../components/QRGenerator';
import { TicketEditModal } from '../components/TicketEditModal';
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
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const { logout } = useAuth();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 600;

  // Cargar tickets y ferias
  const loadData = async () => {
    setLoading(true);
    try {
      const [ticketsRes, feriasRes] = await Promise.all([
        fetch('http://va-server.duckdns.org:3000/api/ticket'),
        fetch('http://va-server.duckdns.org:3000/api/feria'),
      ]);
      
      if (!ticketsRes.ok) throw new Error(`HTTP error! status: ${ticketsRes.status} al cargar tickets`);
      if (!feriasRes.ok) throw new Error(`HTTP error! status: ${feriasRes.status} al cargar ferias`);

      const ticketsData = await ticketsRes.json();
      const feriasData = await feriasRes.json();
      
      if (ticketsData.ok && feriasData.ok) {
        setTickets(ticketsData.datos);
        setFerias(feriasData.datos);
      } else {
        // Si la respuesta JSON indica error aunque HTTP sea 200
        throw new Error(ticketsData.mensaje || feriasData.mensaje || 'Error al cargar los datos (API)');
      }
    } catch (e) {
      console.error('Error al cargar los datos:', e);
      Alert.alert('Error de Carga', (e as Error).message || 'No se pudieron cargar los datos');
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []); // Cargar datos al montar

  // Guardar ticket
  const handleSaveTicket = async (updatedTicket: Partial<Ticket>) => {
    const isCreating = !updatedTicket.idTicket || updatedTicket.idTicket === 0;
    const url = `http://va-server.duckdns.org:3000/api/ticket${isCreating ? '' : `/${updatedTicket.idTicket}`}`;
    const method = isCreating ? 'POST' : 'PUT';

    const body = isCreating ? {
      idFeria: updatedTicket.idFeria,
      nombre: updatedTicket.nombre,
      tipo: updatedTicket.tipo,
      cantidad_inicial: updatedTicket.cantidad_inicial,
      estado: updatedTicket.estado,
      // No enviar 'usos' ni 'idTicket' al crear
    } : {
      nombre: updatedTicket.nombre,
      tipo: updatedTicket.tipo,
      estado: updatedTicket.estado,
      usos: updatedTicket.usos,
      // No enviar 'idFeria' ni 'cantidad_inicial' al editar si no se permiten cambios
    };

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('API Error:', data);
        throw new Error(data.mensaje || `Error HTTP ${res.status} al ${isCreating ? 'crear' : 'actualizar'} el ticket`);
      }
      
      // Si se creó, navegar al detalle del nuevo ticket
      if (isCreating && data.ok && data.datos && data.datos.idTicket) {
         router.push(`/tickets/${data.datos.idTicket}`);
      } else {
        // Si se actualizó o la creación no devolvió ID, solo recargar datos
        await loadData();
      }

    } catch (e) {
      console.error('Fetch Error:', e);
      Alert.alert('Error', (e as Error).message || `No se pudo ${isCreating ? 'crear' : 'actualizar'} el ticket`);
    } finally {
      // Cerrar modal después de guardar (éxito o error)
      // Esto se maneja en el onClose del modal en TicketsScreen
    }
  };

  // Cambiar estado
  const handleToggleEstado = async (ticket: Ticket) => {
    try {
      const res = await fetch(`http://va-server.duckdns.org:3000/api/ticket/${ticket.idTicket}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: ticket.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' }),
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status} al cambiar estado`);

      // Si la API devuelve éxito, recargar
      const data = await res.json();
      if (data.ok) {
         loadData();
      } else {
        throw new Error(data.mensaje || 'Error al cambiar estado (API)');
      }

    } catch (e) {
      console.error('Fetch Error:', e);
      Alert.alert('Error', (e as Error).message || 'No se pudo cambiar el estado');
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
      <Text>Fecha creación: {item.fecha_creacion ? format(new Date(item.fecha_creacion), 'dd/MM/yyyy') : '-'}</Text>
      <View style={[styles.ticketActions, isMobile && styles.ticketActionsMobile]}>
        <Button 
          title="Editar" 
          onPress={() => {
            setSelectedTicket(item);
            setEditModalVisible(true);
          }} 
        />
        <Button
          title={item.estado === 'ACTIVO' ? 'Desactivar' : 'Activar'}
          color={item.estado === 'ACTIVO' ? '#FF3B30' : '#34C759'}
          onPress={() => handleToggleEstado(item)}
        />
        {item.estado === 'ACTIVO' && (
          <Button
            title="Generar QR"
            color="#007AFF"
            onPress={() => {
              setSelectedTicket(item);
              setQrModalVisible(true);
            }}
          />
        )}
      </View>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      {/* Restaurar el header original: solo NavigationHeader */}
      <NavigationHeader />

      {/* Botón superior para escritorio */}
      {!isMobile && (
        <TouchableOpacity
          style={styles.createButtonDesktop}
          onPress={() => {
            setSelectedTicket({
              idTicket: 0,
              idFeria: null,
              nombre: '',
              tipo: '',
              cantidad_inicial: 0,
              usos: 0,
              estado: 'ACTIVO',
            });
            setCreating(true);
            setEditModalVisible(true);
          }}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.createButtonTextDesktop}>Crear Ticket</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={tickets}
        renderItem={renderTicket}
        keyExtractor={item => item.idTicket.toString()}
        style={styles.list}
      />
      {/* FAB para móvil */}
      {isMobile && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setSelectedTicket({
              idTicket: 0,
              idFeria: null,
              nombre: '',
              tipo: '',
              cantidad_inicial: 0,
              usos: 0,
              estado: 'ACTIVO',
            });
            setCreating(true);
            setEditModalVisible(true);
          }}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}
      {selectedTicket && (
        <>
          <TicketEditModal
            isVisible={editModalVisible}
            onClose={() => {
              setEditModalVisible(false);
              setCreating(false);
              setSelectedTicket(null);
            }}
            onSave={handleSaveTicket}
            ticket={selectedTicket}
            ferias={ferias}
            isCreating={creating}
          />
          <QRGenerator
            isVisible={qrModalVisible}
            onClose={() => setQrModalVisible(false)}
            ticketId={selectedTicket.idTicket}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { flex: 1 },
  ticketItem: { backgroundColor: 'white', padding: 15, marginVertical: 5, marginHorizontal: 10, borderRadius: 5, elevation: 2 },
  ticketTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  ticketActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 10 },
  ticketActionsMobile: {
    justifyContent: 'flex-start',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  createButtonDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    margin: 16,
    marginBottom: 0,
    elevation: 2,
  },
  createButtonTextDesktop: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  // Eliminar estilos relacionados con el headerContainer y botones añadidos
  headerContainer: {},
  headerButtons: {},
  headerButton: {},
  logoutButtonHeader: {},
}); 