import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as FileSystem from 'expo-file-system/legacy';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, FlatList, Image, Platform, SafeAreaView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationHeader } from '../components/NavigationHeader';
import { QRScannerModal } from '../components/QRScannerModal';
import { createTicketPdf, QRGenerator, ticketQrValue } from '../components/QRGenerator';
import { TicketEditModal } from '../components/TicketEditModal';
import { useAuth } from '../contexts/AuthContext';
import { useFirebaseConfig } from '../contexts/FirebaseConfigContext';
import {
  createTickets,
  getTicketByQrCredential,
  listFerias,
  listTickets,
  updateTicket,
} from '../services/firestoreData';

// Modelos
export type Ticket = {
  idTicket: number;
  qrToken: string;
  idFeria: number | null;
  nombre: string;
  tipo: string;
  fecha_creacion?: string;
  cantidad_inicial: number;
  usos?: number;
  estado?: 'ACTIVO' | 'INACTIVO';
  agotado?: boolean;
  copias?: number;
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
  const [scannerVisible, setScannerVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const { logout, role } = useAuth();
  const { config } = useFirebaseConfig();
  const isEmployee = role === 'EMPLEADO';
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 600;
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sharingSelection, setSharingSelection] = useState(false);
  const batchQrRefs = useRef<Record<number, any>>({});

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
    scannerFab: {
      position: 'absolute',
      left: 16,
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
    employeeWelcome: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 34,
      paddingBottom: 80,
    },
    employeeLogo: {
      width: 108,
      height: 108,
      borderRadius: 28,
      marginBottom: 24,
    },
    employeeTitle: {
      textAlign: 'center',
      marginBottom: 10,
    },
    employeeText: {
      textAlign: 'center',
      opacity: 0.72,
      lineHeight: 22,
      maxWidth: 380,
    },
    employeeHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 22,
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 18,
      backgroundColor: `${theme.buttonPrimary}18`,
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
    selectionToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 10,
      gap: 10,
    },
    selectionActions: { flexDirection: 'row', gap: 10 },
    selectionButton: {
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    checkbox: {
      width: 27,
      height: 27,
      borderRadius: 7,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    hiddenQrContainer: {
      position: 'absolute',
      left: -10000,
      top: 0,
    },
  });

  const toggleTicketSelection = (ticketId: number) => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(ticketId)) next.delete(ticketId);
      else next.add(ticketId);
      return next;
    });
  };

  const closeSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const qrBase64For = (ticketId: number) =>
    new Promise<string>((resolve, reject) => {
      const ref = batchQrRefs.current[ticketId];
      if (!ref) {
        reject(new Error(`No se pudo preparar el QR del ticket ${ticketId}`));
        return;
      }
      ref.toDataURL((base64: string) =>
        resolve(`data:image/png;base64,${base64}`),
      );
    });

  const shareSelectedTickets = async () => {
    const selected = tickets.filter(ticket => selectedIds.has(ticket.idTicket));
    if (selected.length === 0 || !config?.projectId) return;

    setSharingSelection(true);
    try {
      const pdfUris: string[] = [];
      for (const ticket of selected) {
        const temporaryUri = await createTicketPdf({
          nombre: ticket.nombre,
          tipo: ticket.tipo,
          cantidadInicial: ticket.cantidad_inicial,
          qrCodeBase64: await qrBase64For(ticket.idTicket),
        });
        const safeName =
          ticket.nombre
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 40) || 'ticket';
        const finalUri =
          `${FileSystem.cacheDirectory}LaUveTickets_${ticket.idTicket}_${safeName}.pdf`;
        await FileSystem.deleteAsync(finalUri, { idempotent: true });
        await FileSystem.copyAsync({ from: temporaryUri, to: finalUri });
        pdfUris.push(finalUri);
      }

      if (Platform.OS === 'web') {
        throw new Error(
          'La descarga múltiple desde Web estará disponible próximamente. Puedes compartir los PDF desde Android.',
        );
      }

      const { default: Share } = await import('react-native-share');
      await Share.open({
        urls: pdfUris,
        type: 'application/pdf',
        title:
          selected.length === 1
            ? 'Compartir ticket'
            : `Compartir ${selected.length} tickets`,
        failOnCancel: false,
        useInternalStorage: true,
      });
      closeSelection();
    } catch (shareError) {
      Alert.alert(
        'Error',
        (shareError as Error).message || 'No se pudieron compartir los tickets',
      );
    } finally {
      setSharingSelection(false);
    }
  };

  // Cargar tickets y ferias
  const loadData = async () => {
    setLoading(true);
    setError(null);
    if (isEmployee) {
      setTickets([]);
      setFerias([]);
      setLoading(false);
      return;
    }
    try {
      const [ticketsData, feriasData] = await Promise.all([
        listTickets(),
        listFerias(),
      ]);

      setTickets(ticketsData);
      setFerias(feriasData);
      const years: string[] = Array.from(new Set(ticketsData
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
    } catch (e) {
      // console.error('Error al cargar los datos:', e);
      const errorMessage = (e as Error).message || 'No se pudieron cargar los datos';
      setError(errorMessage);
      Alert.alert('Error de Carga', errorMessage);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [isEmployee]);

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

    try {
      if (isCreating) {
        const created = await createTickets({
          idFeria: updatedTicket.idFeria ?? null,
          nombre: updatedTicket.nombre!,
          tipo: updatedTicket.tipo!,
          cantidad_inicial: updatedTicket.cantidad_inicial!,
          usos: 0,
          estado: updatedTicket.estado ?? 'ACTIVO',
          agotado: false,
        }, updatedTicket.copias ?? 1);
        const count = created.length;
        return {
          success: true,
          message: count === 1 ? 'Ticket creado correctamente' : `${count} tickets creados correctamente`,
          newTicketId: count === 1 ? created[0].idTicket : undefined,
        };
      } else {
        await updateTicket(updatedTicket.idTicket!, {
          nombre: updatedTicket.nombre,
          tipo: updatedTicket.tipo,
          estado: updatedTicket.estado,
          usos: updatedTicket.usos,
        });
        return { success: true, message: 'Ticket actualizado correctamente' };
      }

    } catch (e) {
      console.error('Firestore Error:', e);
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
      await updateTicket(ticket.idTicket, {
        estado: ticket.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO',
      });
      await loadData();
    } catch (e) {
      console.error('Firestore Error:', e);
      Alert.alert('Error', (e as Error).message || 'No se pudo cambiar el estado');
    }
  };

  // Renderizar ticket
  const renderTicket = ({ item }: { item: Ticket }) => {
    const feria = ferias.find(f => f.idFeria === item.idFeria);
    const usoPorcentaje = item.usos ? (item.usos / item.cantidad_inicial) * 100 : 0;
    const isActive = item.estado === 'ACTIVO';
    const isExhausted = item.agotado ?? (item.usos ?? 0) >= item.cantidad_inicial;
    const statusColor = !isActive ? theme.error : isExhausted ? '#FF9500' : theme.success;
    const isSelected = selectedIds.has(item.idTicket);
    
    return (
      <ThemedView type="card" style={[
        styles.ticketCard,
        { 
          borderLeftWidth: 4,
          borderLeftColor: statusColor,
          backgroundColor: isSelected ? `${theme.buttonPrimary}24` : `${statusColor}10`,
          borderWidth: isSelected ? 2 : 0,
          borderColor: isSelected ? theme.buttonPrimary : undefined,
        }
      ]}>
        <View style={styles.ticketHeader}>
          {selectionMode && (
            <TouchableOpacity
              accessibilityLabel={isSelected ? 'Deseleccionar ticket' : 'Seleccionar ticket'}
              style={[
                styles.checkbox,
                {
                  borderColor: theme.buttonPrimary,
                  backgroundColor: isSelected ? theme.buttonPrimary : 'transparent',
                },
              ]}
              onPress={() => toggleTicketSelection(item.idTicket)}
            >
              {isSelected && <Ionicons name="checkmark" size={20} color="white" />}
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={styles.ticketTitleContainer}
            onPress={() =>
              selectionMode
                ? toggleTicketSelection(item.idTicket)
                : router.push(`/tickets/${item.idTicket}`)
            }
            onLongPress={() => {
              setSelectionMode(true);
              setSelectedIds(new Set([item.idTicket]));
            }}
          >
            <ThemedText type="title" style={styles.ticketName}>{item.nombre}</ThemedText>
            <ThemedText style={styles.ticketFeria}>{feria?.nombre || 'Sin feria'}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleToggleEstado(item)}
            style={[
              styles.estadoButton,
              { backgroundColor: isActive ? theme.success : theme.error }
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
          {isExhausted && (
            <ThemedText style={{ color: '#FF9500', fontWeight: '700', marginBottom: 8 }}>
              AGOTADO
            </ThemedText>
          )}
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${usoPorcentaje}%`, backgroundColor: theme.buttonPrimary }]} />
          </View>
          {item.fecha_creacion && (
            <ThemedText style={styles.dateText}>
              Creado: {format(new Date(item.fecha_creacion), 'dd/MM/yyyy')}
            </ThemedText>
          )}
        </View>

        {!selectionMode && <View style={[styles.ticketActions, isMobile ? styles.ticketActionsMobile : styles.ticketActionsWeb]}>
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
        </View>}
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
        {!isEmployee && <View style={styles.searchContainer}>
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
          <TouchableOpacity
            accessibilityLabel="Seleccionar tickets"
            style={[styles.createButton, { backgroundColor: theme.buttonPrimary }]}
            onPress={() => {
              if (selectionMode) closeSelection();
              else setSelectionMode(true);
            }}
          >
            <Ionicons
              name={selectionMode ? 'close' : 'checkmark-done'}
              size={20}
              color="white"
            />
            {!isMobile && (
              <ThemedText type="button" style={styles.buttonText}>
                {selectionMode ? 'Cancelar' : 'Seleccionar'}
              </ThemedText>
            )}
          </TouchableOpacity>
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
        </View>}

        {selectionMode && !isEmployee && (
          <View style={styles.selectionToolbar}>
            <ThemedText type="subtitle">
              {selectedIds.size} seleccionados
            </ThemedText>
            <View style={styles.selectionActions}>
              <TouchableOpacity
                style={[styles.selectionButton, { backgroundColor: theme.buttonPrimary }]}
                onPress={shareSelectedTickets}
                disabled={selectedIds.size === 0 || sharingSelection}
              >
                {sharingSelection ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="share-social" size={20} color="white" />
                )}
                <ThemedText type="button" style={styles.buttonText}>
                  Compartir PDFs
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isEmployee ? (
          <View style={styles.employeeWelcome}>
            <Image
              source={require('../assets/images/v.png')}
              style={styles.employeeLogo}
              resizeMode="cover"
            />
            <ThemedText type="title" style={styles.employeeTitle}>
              Modo empleado
            </ThemedText>
            <ThemedText style={styles.employeeText}>
              Tu función es validar los tickets que te entreguen. Escanea el
              código QR y podrás añadirle un uso si sigue disponible.
            </ThemedText>
            <View style={styles.employeeHint}>
              <Ionicons name="scan" size={22} color={theme.buttonPrimary} />
              <ThemedText style={{ color: theme.buttonPrimary, fontWeight: '700' }}>
                Pulsa el botón azul para escanear
              </ThemedText>
            </View>
          </View>
        ) : loading ? (
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
              <>
                <TouchableOpacity
                  accessibilityLabel="Crear ticket"
                  style={[styles.fab, { backgroundColor: '#FFC107' }]}
                  onPress={() => {
                    setSelectedTicket(null);
                    setCreating(true);
                    setEditModalVisible(true);
                  }}
                >
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
              </>
            )}
          </>
        )}

        <TouchableOpacity
          accessibilityLabel="Escanear código QR"
          style={[styles.scannerFab, { backgroundColor: theme.buttonPrimary }]}
          onPress={() => setScannerVisible(true)}
        >
          <Ionicons name="scan" size={26} color="white" />
        </TouchableOpacity>
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
        qrToken={selectedTicket?.qrToken || ''}
        nombre={selectedTicket?.nombre || ''}
        tipo={selectedTicket?.tipo || ''}
        cantidadInicial={selectedTicket?.cantidad_inicial || 0}
        projectId={config?.projectId || ''}
      />

      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onTicketScanned={async (ticketId, qrToken) => {
          try {
            const ticket = await getTicketByQrCredential(ticketId, qrToken);
            if (!ticket) return false;
            router.push(`/tickets/${ticketId}`);
            return true;
          } catch {
            return false;
          }
        }}
        projectId={config?.projectId || ''}
      />

      <View pointerEvents="none" style={styles.hiddenQrContainer}>
        {tickets
          .filter(ticket => selectedIds.has(ticket.idTicket))
          .map(ticket => (
            <QRCode
              key={ticket.idTicket}
              value={ticketQrValue(
                config?.projectId || '',
                ticket.idTicket,
                ticket.qrToken,
              )}
              size={250}
              backgroundColor="white"
              getRef={reference => {
                batchQrRefs.current[ticket.idTicket] = reference;
              }}
            />
          ))}
      </View>
    </SafeAreaView>
  );
}
