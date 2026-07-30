import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Calendar, DateData } from 'react-native-calendars';
import { ActivityIndicator, Alert, Dimensions, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import FeriaLocationPicker, {
  FeriaLocationValue,
} from '../components/FeriaLocationPicker';
import { NavigationActionsRegistration } from '../components/NavigationActionsRegistration';
import { NavigationHeaderRegistration } from '../components/NavigationHeaderRegistration';
import { useAuth } from '../contexts/AuthContext';
import { useNavigationChrome } from '../contexts/NavigationChromeContext';
import {
  createFeria,
  listFerias,
  subscribeFerias,
  updateFeria,
} from '../services/firestoreData';

// Caracteres especiales a filtrar de los inputs (para seguridad)
const inputFilterRegex = /[;"'=\\<>]/g;

// Tipos
import type { FeriaRecord } from '../services/firestoreData';
type Feria = FeriaRecord;

type FeriaForm = {
  nombre: string;
  fecha: string;
  fechaInicio: string;
  fechaFin: string;
  latitud?: number;
  longitud?: number;
  ubicacionNombre?: string;
  ubicacionOrigen?: 'DISPOSITIVO' | 'MAPA';
};

const FeriasScreen: React.FC = () => {
  const { reportScroll } = useNavigationChrome();
  const router = useRouter();
  const { logout } = useAuth();
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const isMobile = screenWidth < 600;

  const [ferias, setFerias] = useState<Feria[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [selectedFeria, setSelectedFeria] = useState<Feria | null>(null);
  const [form, setForm] = useState<FeriaForm>({
    nombre: '',
    fecha: '',
    fechaInicio: '',
    fechaFin: '',
  });
  const [formErrors, setFormErrors] = useState<{
    nombre?: string;
    fechaInicio?: string;
    fechaFin?: string;
    ubicacion?: string;
  }>({});
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showRangeCalendar, setShowRangeCalendar] = useState(false);
  const [showLocationPage, setShowLocationPage] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date>(new Date());
  const [dateTarget, setDateTarget] = useState<'fechaInicio' | 'fechaFin'>(
    'fechaInicio',
  );
  const [error, setError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Hook para obtener las áreas seguras

  // Cargar ferias
  const loadFerias = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listFerias();
      setFerias(data);
      const years: string[] = Array.from(new Set(data.map((feria: Feria) => new Date(feria.fecha).getFullYear().toString())));
      years.sort((a, b) => parseInt(b) - parseInt(a));
      setAvailableYears(['Todas las fechas', ...years]);
      const currentYear = String(new Date().getFullYear());
      setSelectedYear(current =>
        current && ['Todas las fechas', ...years].includes(current)
          ? current
          : years.includes(currentYear)
            ? currentYear
            : 'Todas las fechas',
      );
      setError(null);
    } catch (e) {
      // console.error('Error al cargar los datos:', e);
      const errorMessage = (e as Error).message || 'No se pudieron cargar las ferias.';
      setError(errorMessage);
      Alert.alert('Error de Carga', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsubscribe = subscribeFerias(
      data => {
        setFerias(data);
        const years = Array.from(
          new Set(
            data.map(feria =>
              new Date(feria.fecha).getFullYear().toString(),
            ),
          ),
        ).sort((a, b) => Number(b) - Number(a));
        const yearOptions = ['Todas las fechas', ...years];
        setAvailableYears(yearOptions);
        setSelectedYear(current =>
          current && yearOptions.includes(current)
            ? current
            : years.includes(String(new Date().getFullYear()))
              ? String(new Date().getFullYear())
              : 'Todas las fechas',
        );
        setError(null);
        setLoading(false);
      },
      subscriptionError => {
        setError(
          subscriptionError.message || 'No se pudieron sincronizar las ferias.',
        );
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  // Handler para el cambio de año desde NavigationHeader
  const handleYearChange = (year: string | null) => {
    setSelectedYear(year);
  };

  // Validación
  const validate = () => {
    const errors: typeof formErrors = {};
    if (!form.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!form.fechaInicio) errors.fechaInicio = 'La fecha de inicio es obligatoria';
    if (!form.fechaFin) errors.fechaFin = 'La fecha de fin es obligatoria';
    if (
      form.fechaInicio &&
      form.fechaFin &&
      new Date(form.fechaFin) < new Date(form.fechaInicio)
    ) {
      errors.fechaFin = 'La fecha de fin no puede ser anterior al inicio';
    }
    if (!Number.isFinite(form.latitud) || !Number.isFinite(form.longitud)) {
      errors.ubicacion = 'Selecciona la ubicación de la feria';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Abrir modal para crear
  const openCreateModal = () => {
    setEditMode(false);
    const today = new Date();
    setForm({
      nombre: '',
      fecha: today.toISOString(),
      fechaInicio: today.toISOString(),
      fechaFin: today.toISOString(),
    });
    setPendingDate(today);
    setFormErrors({});
    setModalError(null);
    setModalVisible(true);
  };

  // Abrir modal para editar
  const openEditModal = (feria: Feria) => {
    setEditMode(true);
    setSelectedFeria(feria);
    const fechaInicio = feria.fechaInicio ?? feria.fecha;
    setForm({
      nombre: feria.nombre,
      fecha: fechaInicio,
      fechaInicio,
      fechaFin: feria.fechaFin ?? fechaInicio,
      latitud: feria.latitud,
      longitud: feria.longitud,
      ubicacionNombre: feria.ubicacionNombre,
      ubicacionOrigen: feria.ubicacionOrigen,
    });
    setFormErrors({});
    setModalError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setShowDatePicker(false);
    setShowRangeCalendar(false);
    setShowLocationPage(false);
    setModalVisible(false);
    setModalError(null);
  };

  const selectRangeDay = (day: DateData) => {
    const selected = new Date(`${day.dateString}T12:00:00`);
    const currentStart = form.fechaInicio
      ? new Date(form.fechaInicio)
      : undefined;
    const rangeComplete = Boolean(form.fechaInicio && form.fechaFin);

    if (!currentStart || rangeComplete || selected < currentStart) {
      setForm(current => ({
        ...current,
        fecha: selected.toISOString(),
        fechaInicio: selected.toISOString(),
        fechaFin: '',
      }));
      setFormErrors(current => ({
        ...current,
        fechaInicio: undefined,
        fechaFin: undefined,
      }));
      return;
    }

    setForm(current => ({ ...current, fechaFin: selected.toISOString() }));
    setFormErrors(current => ({ ...current, fechaFin: undefined }));
    setShowRangeCalendar(false);
  };

  const rangeMarks = React.useMemo(() => {
    if (!form.fechaInicio) return {};
    const start = new Date(form.fechaInicio);
    const end = form.fechaFin ? new Date(form.fechaFin) : start;
    const marks: Record<string, any> = {};
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = format(cursor, 'yyyy-MM-dd');
      marks[key] = {
        color: theme.buttonPrimary,
        textColor: 'white',
        startingDay: key === format(start, 'yyyy-MM-dd'),
        endingDay: key === format(end, 'yyyy-MM-dd'),
      };
      cursor.setDate(cursor.getDate() + 1);
    }
    return marks;
  }, [form.fechaFin, form.fechaInicio, theme.buttonPrimary]);

  const openDatePicker = (target: 'fechaInicio' | 'fechaFin') => {
    setDateTarget(target);
    setPendingDate(form[target] ? new Date(form[target]) : new Date());
    setShowDatePicker(true);
  };

  const commitDate = (
    date: Date,
    target: 'fechaInicio' | 'fechaFin' = dateTarget,
  ) => {
    setForm(current => {
      const next = { ...current, [target]: date.toISOString() };
      if (target === 'fechaInicio') {
        next.fecha = date.toISOString();
        if (!current.fechaFin || new Date(current.fechaFin) < date) {
          next.fechaFin = date.toISOString();
        }
      }
      return next;
    });
    setFormErrors(current => ({ ...current, [target]: undefined }));
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
      if (editMode && selectedFeria) {
        await updateFeria(selectedFeria.idFeria, form);
      } else {
        await createFeria(form);
      }

      Alert.alert('Éxito', `${editMode ? 'Feria actualizada' : 'Feria creada'} correctamente`);
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

  const toggleFeriaEstado = async (feria: Feria) => {
    const nextEstado =
      (feria.estado ?? 'ACTIVO') === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      await updateFeria(feria.idFeria, { estado: nextEstado });
    } catch (stateError) {
      Alert.alert(
        'Error',
        (stateError as Error).message ||
          `No se pudo ${nextEstado === 'ACTIVO' ? 'activar' : 'inactivar'} la feria`,
      );
    }
  };

  // Renderizar feria
  const renderFeria = ({ item }: { item: Feria }) => {
    const isActive = (item.estado ?? 'ACTIVO') === 'ACTIVO';
    return (
    <ThemedView
      type="card"
      style={[
        styles.feriaItem,
        {
          borderLeftColor: isActive ? theme.success : theme.error,
          opacity: isActive ? 1 : 0.72,
        },
      ]}
    >
      <View style={styles.feriaContent}>
        <View style={styles.feriaInfo}>
          <ThemedText type="title" style={styles.feriaTitle}>{item.nombre}</ThemedText>
          <ThemedText style={styles.feriaDate}>
            {format(new Date(item.fechaInicio ?? item.fecha), 'dd/MM/yyyy')}
            {' — '}
            {format(
              new Date(item.fechaFin ?? item.fechaInicio ?? item.fecha),
              'dd/MM/yyyy',
            )}
          </ThemedText>
          <ThemedText style={styles.feriaLocation}>
            <Ionicons name="location-outline" size={13} />{' '}
            {item.ubicacionNombre || 'Sin ubicación'}
          </ThemedText>
          <ThemedText
            style={[
              styles.feriaEstado,
              { color: isActive ? theme.success : theme.error },
            ]}
          >
            {isActive ? 'ACTIVA' : 'INACTIVA'}
          </ThemedText>
        </View>
        <View style={styles.feriaActions}>
          <TouchableOpacity
            style={[styles.stateButton, { backgroundColor: isActive ? theme.error : theme.success }]}
            onPress={() => toggleFeriaEstado(item)}
          >
            <Ionicons
              name={isActive ? 'pause-circle-outline' : 'play-circle-outline'}
              size={19}
              color="white"
            />
            <ThemedText type="button" style={styles.editButtonText}>
              {isActive ? 'Inactivar' : 'Activar'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: theme.buttonPrimary }]}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="pencil" size={20} color="white" />
            <ThemedText type="button" style={styles.editButtonText}>Editar</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </ThemedView>
    );
  };

  // Filtrar ferias por año y término de búsqueda
  const filteredFerias = ferias.filter(feria => {
    if (feria.visible_en_listado === false) return false;
    const matchesSearch = searchQuery.toLowerCase() === '' || 
      feria.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = selectedYear === 'Todas las fechas' || 
      new Date(feria.fechaInicio ?? feria.fecha).getFullYear().toString() === selectedYear;
    return matchesSearch && matchesYear;
  });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
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
    errorTextCentered: {
      textAlign: 'center',
      marginTop: 10,
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
      paddingBottom: 116,
    },
    feriaItem: {
      marginBottom: 16,
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      elevation: 3,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    feriaContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    feriaInfo: {
      flex: 1,
      marginRight: 16,
    },
    feriaTitle: {
      marginBottom: 4,
    },
    feriaDate: {
      fontSize: 14,
      opacity: 0.7,
    },
    feriaLocation: {
      marginTop: 5,
      fontSize: 13,
      opacity: 0.8,
    },
    feriaEstado: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '800',
    },
    feriaActions: {
      gap: 8,
    },
    stateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      borderRadius: 8,
      gap: 6,
      minWidth: 120,
    },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      gap: 8,
      minWidth: 120,
    },
    editButtonText: {
      color: 'white',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      textAlign: 'center',
    },
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 480,
      height: '91%',
      borderRadius: 20,
      paddingTop: 22,
      paddingHorizontal: 22,
      paddingBottom: 0,
      elevation: 8,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    modalTitle: {
      marginBottom: 20,
    },
    input: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    inputError: {
      borderColor: '#FF3B30',
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      marginBottom: 8,
    },
    errorText: {
      color: '#FF3B30',
      marginBottom: 16,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingTop: 12,
      paddingBottom: 14,
      marginTop: 4,
    },
    modalButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      marginHorizontal: 4,
      elevation: 3,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    buttonText: {
      color: 'white',
    },
    dateButton: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 0,
    },
    datePickerCard: {
      width: '100%',
      maxWidth: 420,
      borderRadius: 20,
      padding: 20,
    },
    datePickerActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 12,
    },
    datePickerAction: {
      minWidth: 108,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    modalScroll: { width: '100%', flex: 1 },
    modalScrollContent: { paddingBottom: 18 },
    sectionLabel: { marginTop: 4, marginBottom: 10, fontWeight: '700' },
    rangeCalendar: {
      marginTop: 10,
      borderWidth: 1,
      borderRadius: 14,
      overflow: 'hidden',
      paddingBottom: 8,
    },
    rangeHelp: {
      textAlign: 'center',
      opacity: 0.65,
      fontSize: 12,
      paddingHorizontal: 10,
    },
    locationSummary: {
      minHeight: 66,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
      marginBottom: 12,
    },
    locationPage: {
      zIndex: 20,
      minHeight: 650,
      padding: 16,
    },
    locationHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    locationBack: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={50} color={theme.error} />
          <ThemedText type="subtitle" style={styles.errorTextCentered}>
            Error al cargar las ferias: {error}
          </ThemedText>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.buttonPrimary }]} 
            onPress={loadFerias}
          >
            <ThemedText type="button" style={styles.buttonText}>Reintentar</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <NavigationHeaderRegistration
        tab="Ferias"
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
      />
      <NavigationActionsRegistration
        tab="Ferias"
        onCreate={isMobile ? openCreateModal : undefined}
      />

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <TextInput
            style={[styles.searchInput, { 
              backgroundColor: theme.inputBackground,
              borderColor: theme.border,
              color: theme.text
            }]}
            placeholder="Buscar ferias..."
            placeholderTextColor={theme.placeholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {!isMobile && (
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: '#FFC107' }]}
              onPress={openCreateModal}
            >
              <Ionicons name="add" size={20} color="white" />
              <ThemedText type="button" style={styles.buttonText}>Nueva Feria</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.buttonPrimary} />
          </View>
        ) : filteredFerias.length > 0 ? (
          <FlatList
            onScroll={(event) =>
              reportScroll('Ferias', event.nativeEvent.contentOffset.y)
            }
            scrollEventThrottle={16}
            data={filteredFerias}
            keyExtractor={(item) => item.idFeria.toString()}
            renderItem={renderFeria}
            contentContainerStyle={styles.listContainer}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText type="subtitle" style={styles.emptyText}>
              No hay ferias disponibles para este año.
            </ThemedText>
          </View>
        )}

      </View>

      {/* Modal de creación/edición */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={closeModal}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.62)' }]}
          onPress={closeModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <Pressable style={{ width: '100%', alignItems: 'center' }} onPress={(event) => event.stopPropagation()}>
              <ThemedView type="card" style={styles.modalContent}>
              {showLocationPage ? (
                <View
                  style={[
                    styles.locationPage,
                    { backgroundColor: theme.background },
                  ]}
                >
                  <View style={styles.locationHeader}>
                    <TouchableOpacity
                      style={styles.locationBack}
                      onPress={() => setShowLocationPage(false)}
                    >
                      <Ionicons
                        name="arrow-back"
                        size={26}
                        color={theme.buttonPrimary}
                      />
                    </TouchableOpacity>
                    <ThemedText type="subtitle" style={{ flex: 1 }}>
                      Ubicación de la feria
                    </ThemedText>
                    <TouchableOpacity onPress={() => setShowLocationPage(false)}>
                      <ThemedText
                        style={{
                          color: theme.buttonPrimary,
                          fontWeight: '800',
                        }}
                      >
                        Listo
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                  <FeriaLocationPicker
                    initialSearch={form.nombre}
                    value={
                      Number.isFinite(form.latitud) &&
                      Number.isFinite(form.longitud)
                        ? ({
                            latitud: form.latitud!,
                            longitud: form.longitud!,
                            ubicacionNombre: form.ubicacionNombre,
                            ubicacionOrigen: form.ubicacionOrigen ?? 'MAPA',
                          } satisfies FeriaLocationValue)
                        : undefined
                    }
                    onChange={location => {
                      setForm(current => ({ ...current, ...location }));
                      setFormErrors(current => ({
                        ...current,
                        ubicacion: undefined,
                      }));
                    }}
                  />
                </View>
              ) : (
              <>
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <ThemedText type="title" style={styles.modalTitle}>
                  {editMode ? 'Editar Feria' : 'Nueva Feria'}
                </ThemedText>

                <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBackground,
                    borderColor: formErrors.nombre ? theme.error : theme.border,
                    color: theme.text
                  }
                ]}
                placeholder="Nombre"
                placeholderTextColor={theme.placeholder}
                value={form.nombre}
                onChangeText={(text) => setForm((f) => ({ ...f, nombre: text.replace(inputFilterRegex, '') }))}
                />
                {formErrors.nombre && (
                  <ThemedText style={[styles.errorText, { color: theme.error }]}>
                    {formErrors.nombre}
                  </ThemedText>
                )}

                <View style={styles.inputGroup}>
                  <ThemedText style={styles.label}>Fechas de la feria</ThemedText>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      styles.dateButton,
                      {
                        backgroundColor: theme.inputBackground,
                        borderColor:
                          formErrors.fechaInicio || formErrors.fechaFin
                            ? theme.error
                            : theme.border,
                      },
                    ]}
                    onPress={() => setShowRangeCalendar(value => !value)}
                  >
                    <View>
                      <ThemedText style={{ fontWeight: '700' }}>
                        {form.fechaInicio
                          ? format(new Date(form.fechaInicio), 'dd/MM/yyyy')
                          : 'Seleccionar inicio'}
                        {'  →  '}
                        {form.fechaFin
                          ? format(new Date(form.fechaFin), 'dd/MM/yyyy')
                          : 'Seleccionar fin'}
                      </ThemedText>
                      <ThemedText style={{ opacity: 0.6, fontSize: 12 }}>
                        Elige primero la entrada y después la salida
                      </ThemedText>
                    </View>
                    <Ionicons
                      name="calendar-outline"
                      size={22}
                      color={theme.buttonPrimary}
                    />
                  </TouchableOpacity>
                  {showRangeCalendar && (
                    <View
                      style={[
                        styles.rangeCalendar,
                        { borderColor: theme.border },
                      ]}
                    >
                      <Calendar
                        markingType="period"
                        markedDates={rangeMarks}
                        onDayPress={selectRangeDay}
                        theme={{
                          calendarBackground: 'transparent',
                          dayTextColor: theme.text,
                          monthTextColor: theme.text,
                          textDisabledColor: theme.placeholder,
                          arrowColor: theme.buttonPrimary,
                          todayTextColor: theme.buttonPrimary,
                        }}
                      />
                      <ThemedText style={styles.rangeHelp}>
                        {form.fechaInicio && !form.fechaFin
                          ? 'Ahora selecciona la fecha de fin'
                          : 'Al tocar otra fecha se inicia un rango nuevo'}
                      </ThemedText>
                    </View>
                  )}
                  {(formErrors.fechaInicio || formErrors.fechaFin) && (
                    <ThemedText
                      style={[styles.errorText, { color: theme.error }]}
                    >
                      {formErrors.fechaInicio || formErrors.fechaFin}
                    </ThemedText>
                  )}
                </View>

                <ThemedText style={styles.sectionLabel}>Ubicación</ThemedText>
                <TouchableOpacity
                  style={[
                    styles.locationSummary,
                    {
                      backgroundColor: theme.inputBackground,
                      borderColor: formErrors.ubicacion
                        ? theme.error
                        : theme.border,
                    },
                  ]}
                  onPress={() => setShowLocationPage(true)}
                >
                  <Ionicons
                    name="map-outline"
                    size={24}
                    color={theme.buttonPrimary}
                  />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontWeight: '700' }}>
                      {form.ubicacionNombre || 'Elegir ubicación en el mapa'}
                    </ThemedText>
                    <ThemedText style={{ opacity: 0.6, fontSize: 12 }}>
                      Busca por el nombre o mueve el marcador
                    </ThemedText>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={21}
                    color={theme.placeholder}
                  />
                </TouchableOpacity>
                {formErrors.ubicacion && (
                  <ThemedText style={[styles.errorText, { color: theme.error }]}>
                    {formErrors.ubicacion}
                  </ThemedText>
                )}

                {modalError && (
                  <ThemedText style={[styles.errorText, { color: theme.error }]}>
                    {modalError}
                  </ThemedText>
                )}

              </ScrollView>
              <View
                style={[
                  styles.modalButtons,
                  {
                    borderTopColor: theme.border,
                    backgroundColor: theme.card,
                  },
                ]}
              >
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
                  onPress={async () => {
                    const success = await saveFeria();
                    if (success) closeModal();
                  }}
                >
                  <ThemedText type="button" style={styles.buttonText}>
                    {editMode ? 'Guardar' : 'Crear'}
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.error }]}
                  onPress={closeModal}
                >
                  <ThemedText type="button" style={styles.buttonText}>
                    Cancelar
                  </ThemedText>
                </TouchableOpacity>
              </View>
              </>
              )}
              </ThemedView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={pendingDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (event.type !== 'dismissed' && selectedDate) {
              commitDate(selectedDate);
            }
          }}
        />
      )}

    </View>
  );
};

export default FeriasScreen;
