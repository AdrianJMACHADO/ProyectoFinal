import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationHeader } from '../../components/NavigationHeader';
import { Ticket } from '../tickets';


export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const router = useRouter();
  const theme = useTheme();

  // Hook para obtener las áreas seguras
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadTicket();
  }, [id]);

  const loadTicket = async () => {
    try {
      const res = await fetch(`http://va-server.duckdns.org:3000/api/ticket/${id}`);
      const data = await res.json();
      if (data.ok) {
        setTicket(data.datos);
      } else {
        throw new Error('Error al cargar el ticket');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo cargar el ticket');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleIncrementUsos = async () => {
    if (!ticket) return;

    // Validar que no se exceda la cantidad inicial
    if (ticket.usos && ticket.usos >= ticket.cantidad_inicial) {
      Alert.alert('Error', 'No se pueden incrementar más usos que la cantidad inicial');
      return;
    }

    setUpdating(true);
    try {
      const newUsos = (ticket.usos || 0) + 1;
      const res = await fetch(`http://va-server.duckdns.org:3000/api/ticket/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ticket,
          usos: newUsos,
          // Si los usos llegan al máximo, poner el ticket como inactivo
          estado: newUsos >= ticket.cantidad_inicial ? 'INACTIVO' : 'ACTIVO'
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setTicket(data.datos);
      } else {
        throw new Error('Error al actualizar los usos');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar los usos');
    } finally {
      setUpdating(false);
    }
  };

  // Función para duplicar ticket
  const handleDuplicateTicket = async () => {
    if (!ticket) return;

    setDuplicating(true);
    try {
      const ticketToDuplicate = {
        idFeria: ticket.idFeria, // Mantener idFeria
        nombre: ticket.nombre, // Mantener nombre
        tipo: ticket.tipo, // Mantener tipo
        cantidad_inicial: ticket.cantidad_inicial, // Mantener cantidad_inicial
        usos: 0, // Resetear usos a 0
        estado: 'ACTIVO', // Poner estado a ACTIVO
        // idTicket y fecha_creacion no se envían, la API los generará
      };

      const res = await fetch('http://va-server.duckdns.org:3000/api/ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketToDuplicate),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        console.error('API Error (Duplicating):', data);
        throw new Error(data.mensaje || `Error HTTP ${res.status} al duplicar el ticket`);
      }

      Alert.alert('Éxito', 'Ticket duplicado correctamente');
      // Opcional: redirigir al nuevo ticket o refrescar la lista de tickets principal
      // router.push(`/tickets/${data.datos.idTicket}`); // Redirigir al nuevo ticket duplicado

    } catch (error) {
      console.error('Error duplicating ticket:', error);
      Alert.alert('Error', (error as Error).message || 'No se pudo duplicar el ticket');
    } finally {
      setDuplicating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.buttonPrimary} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
        <View style={[styles.container, { backgroundColor: theme.background }]}>
          <View style={styles.center}>
            <ThemedText>Ticket no encontrado</ThemedText>
            <TouchableOpacity
              style={[
                styles.retryButton,
                {
                  backgroundColor: loading ? theme.border : theme.buttonPrimary,
                  opacity: loading ? 0.7 : 1,
                  marginTop: 20
                }
              ]}
              onPress={() => {
                setLoading(true);
                loadTicket();
              }}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <ThemedText type="button" style={styles.retryButtonText}>Reintentar</ThemedText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isActive = ticket.estado === 'ACTIVO';
  const canIncrement = isActive && (ticket.usos || 0) < ticket.cantidad_inicial;

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <NavigationHeader />
        <ThemedView
          type="card"
          style={[
            styles.details,
            {
              borderLeftWidth: 4,
              borderLeftColor: isActive ? theme.success : theme.error,
              backgroundColor: isActive ? `${theme.success}10` : `${theme.error}10`
            }
          ]}
        >
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>{ticket.nombre}</ThemedText>
            <View style={styles.statusAndDuplicateContainer}>
              <TouchableOpacity
                style={[
                  styles.estadoButton,
                  { backgroundColor: isActive ? theme.success : theme.error }
                ]}
              >
                <ThemedText type="button" style={styles.estadoText}>
                  {ticket.estado}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.duplicateButton,
                  { backgroundColor: duplicating ? theme.border : theme.buttonPrimary, opacity: duplicating ? 0.7 : 1 }
                ]}
                onPress={handleDuplicateTicket}
                disabled={duplicating}
              >
                {duplicating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="copy" size={20} color="white" />
                    <ThemedText type="button" style={styles.duplicateButtonText}>Duplicar</ThemedText>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <ThemedText style={styles.label}>Tipo:</ThemedText>
              <ThemedText style={styles.value}>{ticket.tipo}</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.label}>Cantidad Inicial:</ThemedText>
              <ThemedText style={styles.value}>{ticket.cantidad_inicial}</ThemedText>
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.label}>Usos:</ThemedText>
              <View style={styles.usosContainer}>
                <ThemedText style={styles.value}>{ticket.usos ?? 0}</ThemedText>
                {canIncrement && (
                  <TouchableOpacity
                    style={[
                      styles.incrementButton,
                      {
                        backgroundColor: updating ? theme.border : theme.buttonPrimary,
                        opacity: updating ? 0.7 : 1
                      }
                    ]}
                    onPress={handleIncrementUsos}
                    disabled={updating}
                    accessibilityLabel="Incrementar usos"
                    accessibilityHint="Pulsa para incrementar el número de usos del ticket"
                  >
                    {updating ? (
                      <ActivityIndicator size="large" color="white" />
                    ) : (
                      <Ionicons name="add" size={32} color="white" />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, {
                width: `${((ticket.usos || 0) / ticket.cantidad_inicial) * 100}%`,
                backgroundColor: theme.buttonPrimary
              }]} />
            </View>

            <View style={styles.infoRow}>
              <ThemedText style={styles.label}>Fecha de Creación:</ThemedText>
              <ThemedText style={styles.value}>
                {ticket.fecha_creacion ? format(new Date(ticket.fecha_creacion), 'dd/MM/yyyy') : '-'}
              </ThemedText>
            </View>
          </View>
        </ThemedView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    flex: 1,
    marginRight: 12,
  },
  estadoButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  estadoText: {
    color: 'white',
  },
  infoSection: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'column',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
  },
  usosContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 64,
    marginTop: 8,
  },
  incrementButton: {
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
    minHeight: 64,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  statusAndDuplicateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  duplicateButton: {
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  duplicateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 