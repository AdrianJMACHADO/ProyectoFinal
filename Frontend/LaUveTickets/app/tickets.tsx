import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Dimensions, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

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

  // Filtrar tickets por año y término de búsqueda
  const filteredTickets = tickets.filter(ticket => {
    // Filtrar por año de creación del ticket
    const matchesYear = selectedYear === 'Todas las fechas'
      ? true
      : (ticket.fecha_creacion && new Date(ticket.fecha_creacion).getFullYear().toString() === selectedYear);

    // Filtrar por término de búsqueda (nombre de ticket o nombre de feria)
    const searchTerm = searchQuery.toLowerCase();
    const matchesSearch = searchTerm === ''
      || (ticket.nombre && ticket.nombre.toLowerCase().includes(searchTerm))
      || (ferias.find(f => f.idFeria === ticket.idFeria)?.nombre && ferias.find(f => f.idFeria === ticket.idFeria)!.nombre.toLowerCase().includes(searchTerm));

    return matchesYear && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <NavigationHeader 
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
      />

      {/* Contenedor para el buscador y el botón de crear ticket */}
      <View style={styles.searchAndCreateContainer}>
        {/* Buscador */}
        <TextInput
          style={[styles.searchInput, isMobile && styles.searchInputMobile]}
          placeholder="Buscar ticket o feria..."
          value={searchQuery}
          onChangeText={handleSearch}
        />

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
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={50} color="#FF3B30" />
          <Text style={styles.errorTextCentered}>Error al cargar los tickets: {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          renderItem={renderTicket}
          keyExtractor={item => item.idTicket.toString()}
          style={styles.list}
        />
      )}
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
              setEditModalError(null); // Limpiar error al cerrar
            }}
            onSave={handleModalSave} // Usamos nuestro nuevo manejador
            ticket={selectedTicket}
            ferias={ferias}
            isCreating={creating}
            isLoading={editModalLoading} // Pasamos estado de carga al modal
            error={editModalError} // Pasamos mensaje de error al modal
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
  searchAndCreateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
    marginTop: 5,
  },
  searchInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 15,
    flex: 1,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  searchInputMobile: {
    flex: 1,
    marginRight: 0,
    marginBottom: 10,
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