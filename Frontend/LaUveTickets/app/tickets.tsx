import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, SafeAreaView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

  // Hook para obtener las áreas seguras
  const insets = useSafeAreaInsets();

  // Nuevos estados para el modal de edición
  const [editModalLoading, setEditModalLoading] = useState(false);
  const [editModalError, setEditModalError] = useState<string | null>(null);

  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
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
    errorText: {
      textAlign: 'center',
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
    ticketCard: {
      marginBottom: 16,
      borderRadius: 12,
      padding: 16,
      elevation: 3,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    ticketHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    ticketTitleContainer: {
      flex: 1,
      marginRight: 12,
    },
    ticketName: {
      marginBottom: 4,
    },
    ticketFeria: {
      fontSize: 14,
      opacity: 0.7,
    },
    estadoButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    estadoText: {
      color: 'white',
    },
    ticketInfo: {
      marginBottom: 16,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    progressContainer: {
      height: 4,
      backgroundColor: '#e0e0e0',
      borderRadius: 2,
      marginBottom: 8,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 2,
    },
    dateText: {
      fontSize: 14,
    },
    ticketActions: {
      flexDirection: 'row',
      gap: 12,
    },
    ticketActionsMobile: {
      justifyContent: 'space-between',
    },
    ticketActionsWeb: {
      justifyContent: 'flex-end',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      borderRadius: 8,
      gap: 8,
      minWidth: 120,
      elevation: 3,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    buttonText: {
      color: 'white',
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
    center: { 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center' 
    },
    errorTextCentered: {
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 20,
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
  });

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
      // console.error('Error al cargar los datos:', e);
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
    const isCreating = !updatedTicket.idTicket || updatedTicket.idTicket === 0;
    const url = `http://va-server.duckdns.org:3000/api/ticket${isCreating ? '' : `/${updatedTicket.idTicket}`}`;
    const method = isCreating ? 'POST' : 'PUT';

    const body = isCreating ? {
      idFeria: updatedTicket.idFeria,
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

      if (isCreating) {
        return { success: true, message: 'Ticket creado correctamente', newTicketId: data.datos?.idTicket };
      } else {
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
      if (creating && result.newTicketId) {
        router.push(`/tickets/${result.newTicketId}`);
      } else {
        await loadData();
      }
      setEditModalVisible(false);
      setCreating(false);
      setSelectedTicket(null);
    } else {
      setEditModalError(result.message || 'Error desconocido al guardar');
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
  const renderTicket = ({ item }: { item: Ticket }) => {
    const feria = ferias.find(f => f.idFeria === item.idFeria);
    const usoPorcentaje = item.usos ? (item.usos / item.cantidad_inicial) * 100 : 0;
    
    return (
      <ThemedView type="card" style={[
        styles.ticketCard,
        { 
          borderLeftWidth: 4,
          borderLeftColor: item.estado === 'ACTIVO' ? theme.success : theme.error,
          backgroundColor: item.estado === 'ACTIVO' ? `${theme.success}10` : `${theme.error}10`
        }
      ]}>
        <View style={styles.ticketHeader}>
          <TouchableOpacity 
            style={styles.ticketTitleContainer}
            onPress={() => router.push(`/tickets/${item.idTicket}`)}
          >
            <ThemedText type="title" style={styles.ticketName}>{item.nombre}</ThemedText>
            <ThemedText style={styles.ticketFeria}>{feria?.nombre || 'Sin feria'}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleToggleEstado(item)}
            style={[
              styles.estadoButton,
              { backgroundColor: item.estado === 'ACTIVO' ? theme.success : theme.error }
            ]}
          >
            <ThemedText type="button" style={styles.estadoText}>
              {item.estado}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.ticketInfo}>
          <View style={styles.infoRow}>
            <ThemedText>Tipo: {item.tipo}</ThemedText>
            <ThemedText>Usos: {item.usos || 0}/{item.cantidad_inicial}</ThemedText>
          </View>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${usoPorcentaje}%`, backgroundColor: theme.buttonPrimary }]} />
          </View>
          {item.fecha_creacion && (
            <ThemedText style={styles.dateText}>
              Creado: {format(new Date(item.fecha_creacion), 'dd/MM/yyyy')}
            </ThemedText>
          )}
        </View>

        <View style={[styles.ticketActions, isMobile ? styles.ticketActionsMobile : styles.ticketActionsWeb]}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.buttonPrimary },
              isMobile && { flex: 1 }
            ]}
            onPress={() => {
              setSelectedTicket(item);
              setQrModalVisible(true);
            }}
          >
            <Ionicons name="qr-code" size={20} color="white" />
            <ThemedText type="button" style={styles.buttonText}>Ver QR</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: theme.buttonPrimary },
              isMobile && { flex: 1 }
            ]}
            onPress={() => {
              setSelectedTicket(item);
              setCreating(false);
              setEditModalVisible(true);
            }}
          >
            <Ionicons name="pencil" size={20} color="white" />
            <ThemedText type="button" style={styles.buttonText}>Editar</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  };

  if (loading) return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.buttonPrimary} />
      </View>
    </SafeAreaView>
  );

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={50} color={theme.error} />
          <ThemedText type="subtitle" style={styles.errorTextCentered}>Error al cargar los tickets: {error}</ThemedText>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.buttonPrimary }]} 
            onPress={loadData}
          >
            <ThemedText type="button" style={styles.buttonText}>Reintentar</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Filtrar tickets por año y término de búsqueda
  const filteredTickets = tickets.filter(ticket => {
    const feria = ferias.find(f => f.idFeria === ticket.idFeria);
    const matchesSearch = searchQuery.toLowerCase() === '' || 
      ticket.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (feria?.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesYear = selectedYear === 'Todas las fechas' || 
      (ticket.fecha_creacion && new Date(ticket.fecha_creacion).getFullYear().toString() === selectedYear);
    return matchesSearch && matchesYear;
  });

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <NavigationHeader
        onYearChange={handleYearChange}
        availableYears={availableYears}
        selectedYear={selectedYear}
      />

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { 
              backgroundColor: theme.inputBackground,
              borderColor: theme.border,
              color: theme.text
            }]}
            placeholder="Buscar tickets..."
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {!isMobile && (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: '#FFC107' }]}
              onPress={() => {
                setSelectedTicket(null);
                setCreating(true);
                setEditModalVisible(true);
              }}
            >
              <Ionicons name="add" size={20} color="white" />
              <ThemedText type="button" style={styles.buttonText}>Crear Ticket</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.buttonPrimary} />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <ThemedText type="subtitle" style={styles.errorText}>{error}</ThemedText>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: theme.buttonPrimary }]}
              onPress={loadData}
            >
              <ThemedText type="button" style={styles.buttonText}>Reintentar</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={filteredTickets}
              renderItem={renderTicket}
              keyExtractor={item => item.idTicket.toString()}
              contentContainerStyle={styles.listContainer}
            />

            {isMobile && (
              <TouchableOpacity
                style={[styles.fab, { backgroundColor: '#FFC107' }]}
                onPress={() => {
                  setSelectedTicket(null);
                  setCreating(true);
                  setEditModalVisible(true);
                }}
              >
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      <TicketEditModal
        isVisible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedTicket(null);
          setCreating(false);
        }}
        onSave={handleModalSave}
        ticket={selectedTicket || undefined}
        ferias={ferias}
        isCreating={creating}
        isLoading={editModalLoading}
        error={editModalError}
      />

      <QRGenerator
        isVisible={qrModalVisible}
        onClose={() => setQrModalVisible(false)}
        ticketId={selectedTicket?.idTicket || 0}
        nombre={selectedTicket?.nombre || ''}
        tipo={selectedTicket?.tipo || ''}
        cantidadInicial={selectedTicket?.cantidad_inicial || 0}
      />
    </SafeAreaView>
  );
}