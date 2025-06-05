import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Dimensions, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const isMobile = screenWidth < 600; // Esto podría no ser preciso en web, pero mantengamos la lógica por ahora
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Nuevos estados para el modal de edición
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);

  // Cargar tickets y ferias
  const loadData = async () => {
    setLoading(true);
    setError(null);
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
        const years: string[] = Array.from(new Set(ticketsData.datos
          .filter((ticket: Ticket) => ticket.fecha_creacion)
          .map((ticket: Ticket) => new Date(ticket.fecha_creacion!).getFullYear().toString())));
        years.sort((a, b) => parseInt(b) - parseInt(a));
        setAvailableYears(['Todas las fechas', ...years]);
        if (years.length > 0) {
          setSelectedYear(years[0]);
        } else {
          setSelectedYear('Todas las fechas');
        }
        setError(null);
      } else {
        const errorMessage = ticketsData.mensaje || feriasData.mensaje || 'Error al cargar los datos (API)';
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (e) {
      console.error('Error al cargar los datos:', e);
      const errorMessage = (e as Error).message || 'No se pudieron cargar los datos';
      setError(errorMessage);
      Alert.alert('Error de Carga', errorMessage);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Handler para el cambio de año desde NavigationHeader
  const handleYearChange = (year: string | null) => {
    setSelectedYear(year);
  };

  // Handler para el cambio del término de búsqueda
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Guardar ticket
  const handleSaveTicket = async (updatedTicket: Partial<Ticket>) => {
    // Esta función ahora solo maneja la llamada a la API y devuelve éxito/error.
    // La lógica de carga, error y cierre del modal se manejará en el onSave del modal.
    const isCreating = !updatedTicket.idTicket || updatedTicket.idTicket === 0;
    const url = `http://va-server.duckdns.org:3000/api/ticket${isCreating ? '' : `/${updatedTicket.idTicket}`}`;
    const method = isCreating ? 'POST' : 'PUT';

    const body = isCreating ? {
      idFeria: updatedTicket.idFeria, // Asegurarse de que idFeria no sea undefined si es nueva creación
      nombre: updatedTicket.nombre,
      tipo: updatedTicket.tipo,
      cantidad_inicial: updatedTicket.cantidad_inicial,
      estado: updatedTicket.estado,
    } : {
      nombre: updatedTicket.nombre,
      tipo: updatedTicket.tipo,
      estado: updatedTicket.estado,
      usos: updatedTicket.usos,
    };

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        console.error('API Error:', data);
        return { success: false, message: data.mensaje || `Error HTTP ${res.status} al ${isCreating ? 'crear' : 'actualizar'} el ticket` };
      }

      // Si tiene éxito
      if (isCreating) {
        // Creación exitosa
        // No mostramos alerta aquí, la manejaremos en el onSave del modal
        return { success: true, message: 'Ticket creado correctamente', newTicketId: data.datos?.idTicket };
      } else {
        // Actualización exitosa
        // No mostramos alerta aquí, la manejaremos en el onSave del modal
        return { success: true, message: 'Ticket actualizado correctamente' };
      }

    } catch (e) {
      console.error('Fetch Error:', e);
      return { success: false, message: (e as Error).message || `No se pudo ${isCreating ? 'crear' : 'actualizar'} el ticket` };
    }
  };

  // Manejador de guardado para el modal
  const handleModalSave = async (updatedTicket: Partial<Ticket>) => {
    setEditModalLoading(true);
    setEditModalError(null);

    const result = await handleSaveTicket(updatedTicket);

    setEditModalLoading(false);

    if (result.success) {
      Alert.alert('Éxito', result.message);
      // Recargar datos o navegar si fue creación
      if (creating && result.newTicketId) {
        router.push(`/tickets/${result.newTicketId}`);
      } else {
        await loadData();
      }
      // Cerrar modal
      setEditModalVisible(false);
      setCreating(false);
      setSelectedTicket(null);
    } else {
      // Mostrar error en el modal
      setEditModalError(result.message || 'Error desconocido al guardar');
      // No cerrar el modal en caso de error
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
    <LinearGradient
      colors={
        item.estado === 'ACTIVO'
          ? ['#FFFFFF', '#FFFFFF', '#34C759']  // Blanco -> Blanco -> Verde
          : ['#FFFFFF', '#FFFFFF', '#FF3B30']  // Blanco -> Blanco -> Rojo
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.ticketItem}
      locations={[0, 0.6, 1]}  // Puntos clave: 0%, 80% y 100%
    >
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
    </LinearGradient>
  );

  // Filtros y búsqueda
  const filteredTickets = selectedYear === 'Todas las fechas'
    ? tickets
    : selectedYear
    ? tickets.filter(ticket => ticket.fecha_creacion && new Date(ticket.fecha_creacion).getFullYear().toString() === selectedYear)
    : tickets;

  const searchedTickets = searchQuery
    ? filteredTickets.filter(ticket =>
        ticket.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ticket.tipo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ferias.find(f => f.idFeria === ticket.idFeria)?.nombre.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredTickets;

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="cloud-offline" size={50} color="#FF3B30" />
        <Text style={styles.errorTextCentered}>Error al cargar los tickets: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
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
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
      />
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => {
          setCreating(true);
          setSelectedTicket({} as Ticket); // Estado inicial para un nuevo ticket
          setEditModalVisible(true);
        }}
      >
        <Text style={styles.createButtonText}>+ Nuevo Ticket</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      ) : (
        searchedTickets.length > 0 ? (
          <FlatList
            data={searchedTickets}
            keyExtractor={(item) => item.idTicket.toString()}
            renderItem={renderTicket}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay tickets disponibles para este año o criterio de búsqueda.</Text>
          </View>
        )
      )}

      {/* Modal de Edición */}
      <TicketEditModal
        visible={editModalVisible}
        onClose={() => { setEditModalVisible(false); setCreating(false); setSelectedTicket(null); setEditModalError(null); }}
        ticket={selectedTicket}
        ferias={ferias}
        onSave={handleModalSave}
        isLoading={editModalLoading}
        error={editModalError}
        isCreating={creating}
      />

      {/* Modal de QR */}
      <Modal
        visible={qrModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <Text style={styles.qrModalTitle}>QR Ticket: {selectedTicket?.nombre}</Text>
            {selectedTicket?.idTicket ? (
              <QRGenerator isVisible={true} onClose={() => {}} ticketId={selectedTicket.idTicket} />
            ) : (
              <Text>Generando QR...</Text>
            )}
            <Button title="Cerrar" onPress={() => setQrModalVisible(false)} />
          </View>
        </View>
      </Modal>

    </View>
  );
}

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
  ticketItem: {
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden', // Importante para que el LinearGradient no se salga
  },
  ticketTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  ticketActions: {
    flexDirection: 'column', // Botones en columna por defecto
    marginLeft: 10,
  },
  ticketActionsMobile: {
    flexDirection: 'row', // En móvil, quizás en fila si hay espacio
    flexWrap: 'wrap', // Permitir que los botones envuelvan si no caben
    justifyContent: 'flex-end',
    marginTop: 10,
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
  qrModalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
  },
  qrModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
}); 