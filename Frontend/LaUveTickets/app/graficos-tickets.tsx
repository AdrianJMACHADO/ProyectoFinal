import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { ProgressBar } from 'react-native-paper';
import { NavigationHeaderRegistration } from '../components/NavigationHeaderRegistration';
import { useNavigationChrome } from '../contexts/NavigationChromeContext';
import {
  listFerias,
  listTickets,
  subscribeFerias,
  subscribeTickets,
} from '../services/firestoreData';
import { Feria, Ticket } from './tickets';

const toValidDate = (value: unknown): Date | null => {
  try {
    if (value == null) return null;
    const raw =
      typeof (value as { toDate?: unknown }).toDate === 'function'
        ? (value as { toDate: () => Date }).toDate()
        : value;
    const date = raw instanceof Date ? raw : new Date(raw as any);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const getFeriaYear = (feria: Feria): string | null =>
  toValidDate((feria as Feria & { fecha?: unknown }).fecha)?.getFullYear().toString() ?? null;

const toNonNegativeNumber = (value: unknown): number => {
  const normalized = typeof value === 'string' ? value.replace(',', '.') : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

export default function GraficosTicketsScreen() {
  const { reportScroll } = useNavigationChrome();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ferias, setFerias] = useState<Feria[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { width: screenWidth } = useWindowDimensions();
  const isLargeScreen = screenWidth > 768;
  const theme = useTheme();

  useEffect(() => {
    setLoading(true);
    setError(null);
    let ticketsReady = false;
    let feriasReady = false;
    const finishInitialLoad = () => {
      if (ticketsReady && feriasReady) setLoading(false);
    };
    const handleError = (subscriptionError: Error) => {
      setError(subscriptionError.message || 'No se pudieron sincronizar los datos');
      setLoading(false);
    };

    const unsubscribeTickets = subscribeTickets(data => {
      setTickets(data);
      ticketsReady = true;
      setError(null);
      finishInitialLoad();
    }, handleError);

    const unsubscribeFerias = subscribeFerias(data => {
      setFerias(data);
      const years = Array.from(
        new Set(data.map(getFeriaYear).filter((year): year is string => Boolean(year))),
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
      feriasReady = true;
      setError(null);
      finishInitialLoad();
    }, handleError);

    return () => {
      unsubscribeTickets();
      unsubscribeFerias();
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsData, feriasData] = await Promise.all([
        listTickets(),
        listFerias(),
      ]);
      setTickets(ticketsData);
      setFerias(feriasData);
      const years = Array.from(
        new Set(
          feriasData
            .map((feria: Feria) => getFeriaYear(feria))
            .filter((year): year is string => Boolean(year)),
        ),
      ).sort((a, b) => Number(b) - Number(a));
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
    } catch (error) {
      // console.error('Error al cargar los datos:', error);
      const errorMessage = (error as Error).message || 'No se pudieron cargar los datos';
      setError(errorMessage);
      Alert.alert('Error de Carga', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleYearChange = (year: string | null) => {
    setSelectedYear(year);
  };

  // Define styles inside the component to access theme
  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      padding: 16,
      paddingBottom: 116,
    },
    contentLarge: {
      padding: 24,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
    },
    chartContainer: {
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
      elevation: 8,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    chartContainerLarge: {
      padding: 24,
      marginBottom: 16,
      elevation: 8,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    chartTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 12,
      textAlign: 'center',
    },
    summaryContainer: {
      borderRadius: 10,
      padding: 16,
      marginBottom: 16,
      elevation: 8,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    summaryContainerLarge: {
      padding: 24,
    },
    summaryItem: {
      marginBottom: 10,
      padding: 8,
      borderRadius: 8,
    },
    feriaName: {
      fontSize: 15,
      fontWeight: 'bold',
      marginBottom: 3,
    },
    summaryStats: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    statText: {
      fontSize: 13,
    },
    warningText: {
      fontSize: 12,
      marginTop: 2,
      fontWeight: 'bold',
    },
    legendRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 12,
      gap: 16,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 8,
    },
    legendColor: {
      width: 16,
      height: 16,
      borderRadius: 4,
      marginRight: 6,
    },
    legendText: {
      fontSize: 13,
    },
    progressItem: {
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    progressLabel: {
      fontSize: 15,
      fontWeight: 'bold',
      marginBottom: 8,
      flexShrink: 1,
    },
    progressBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
    },
    progressBarContainer: {
      flex: 1,
      marginRight: 12,
    },
    progressBar: {
      height: 16,
      borderRadius: 8,
      width: '100%',
    },
    progressPercent: {
      fontSize: 14,
      fontWeight: 'bold',
      minWidth: 45,
      textAlign: 'right',
      flexShrink: 0,
    },
    progressItemLarge: {
      marginBottom: 20,
      paddingHorizontal: 8,
    },
    progressLabelLarge: {
      fontSize: 16,
      marginBottom: 10,
    },
    progressBarRowLarge: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      minHeight: 24,
    },
    progressBarContainerLarge: {
      flex: 1,
      marginRight: 24,
      paddingRight: 8,
    },
    progressBarLarge: {
      height: 20,
      borderRadius: 10,
      width: '100%',
    },
    progressPercentLarge: {
      fontSize: 16,
      fontWeight: 'bold',
      minWidth: 60,
      textAlign: 'right',
      flexShrink: 0,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorTextCentered: {
      fontSize: 16,
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 20,
    },
    retryButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    distributionTrack: {
      height: 28,
      borderRadius: 14,
      overflow: 'hidden',
      flexDirection: 'row',
      marginTop: 8,
    },
    distributionSegment: {
      height: '100%',
      minWidth: 2,
    },
    distributionLegend: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginTop: 16,
    },
    distributionLegendItem: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    distributionValue: {
      fontSize: 16,
      fontWeight: '800',
    },
    distributionLabel: {
      fontSize: 12,
      opacity: 0.65,
      marginTop: 2,
    },
    emptyText: {
      textAlign: 'center',
      opacity: 0.7,
      paddingVertical: 24,
    },
  });

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.background },
        ]}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.buttonPrimary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.background },
        ]}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={50} color="#FF3B30" />
          <ThemedText style={styles.errorTextCentered}>Error al cargar los datos: {error}</ThemedText>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.buttonPrimary }]}
            onPress={loadData}
          >
            <ThemedText style={styles.retryButtonText}>Reintentar</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const filteredFerias =
    selectedYear === 'Todas las fechas'
      ? ferias
      : selectedYear
        ? ferias.filter(feria => getFeriaYear(feria) === selectedYear)
        : ferias;

  const feriaById = new Map<string, Feria>(
    filteredFerias.map(feria => [String(feria.idFeria), feria] as [string, Feria]),
  );

  const filteredTickets =
    selectedYear === 'Todas las fechas'
      ? tickets
      : tickets.filter(ticket => feriaById.has(String(ticket.idFeria)));

  const statsByFeria = new Map<
    string,
    { id: string; label: string; generated: number; usedRaw: number }
  >();

  filteredTickets.forEach(ticket => {
    if (ticket.estado !== 'ACTIVO') return;

    const id = String(ticket.idFeria ?? 'SIN_FERIA');
    const feria = feriaById.get(id);
    const current = statsByFeria.get(id) ?? {
      id,
      label: feria?.nombre || 'Sin Feria',
      generated: 0,
      usedRaw: 0,
    };

    current.generated += toNonNegativeNumber(ticket.cantidad_inicial);
    current.usedRaw += toNonNegativeNumber(ticket.usos);
    statsByFeria.set(id, current);
  });

  const feriaStats = Array.from(statsByFeria.values()).map(item => {
    const used = Math.min(item.usedRaw, item.generated);
    const unused = Math.max(item.generated - used, 0);
    return {
      ...item,
      used,
      unused,
      inconsistent: item.usedRaw > item.generated,
      progress: item.generated > 0 ? clamp01(used / item.generated) : 0,
      percentage: item.generated > 0 ? Math.round((used / item.generated) * 100) : 0,
    };
  });

  const totalUsed = feriaStats.reduce((sum, item) => sum + item.used, 0);
  const totalUnused = feriaStats.reduce((sum, item) => sum + item.unused, 0);
  const pieTotal = totalUsed + totalUnused;

  const usedPercent = pieTotal > 0 ? Math.round((totalUsed / pieTotal) * 100) : 0;
  const unusedPercent = pieTotal > 0 ? 100 - usedPercent : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <NavigationHeaderRegistration
        tab="Uso"
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
      />
      <ScrollView
        style={styles.scrollView}
        onScroll={event =>
          reportScroll('Uso', event.nativeEvent.contentOffset.y)
        }
        scrollEventThrottle={16}
      >
        <View style={[styles.content, isLargeScreen && styles.contentLarge]}>
          <ThemedText type="title" style={styles.title}>Gráficos de Tickets</ThemedText>

          <ThemedView type="card" style={[styles.chartContainer, isLargeScreen && styles.chartContainerLarge]}>
            <ThemedText type="subtitle" style={styles.chartTitle}>Porcentaje de uso de tickets por Feria</ThemedText>
            {feriaStats.map(item => (
              <View key={item.id} style={[styles.progressItem, isLargeScreen && styles.progressItemLarge]}>
                <ThemedText style={[styles.progressLabel, isLargeScreen && styles.progressLabelLarge]}>
                  {item.label}
                </ThemedText>
                {isLargeScreen ? (
                  <View style={styles.progressBarRowLarge}>
                    <View style={styles.progressBarContainerLarge}>
                      <ProgressBar
                        progress={item.progress}
                        color={theme.success}
                        style={styles.progressBarLarge}
                      />
                    </View>
                    <ThemedText style={styles.progressPercentLarge}>{item.percentage}%</ThemedText>
                  </View>
                ) : (
                  <View style={styles.progressBarRow}>
                    <View style={styles.progressBarContainer}>
                      <ProgressBar
                        progress={item.progress}
                        color={theme.success}
                        style={styles.progressBar}
                      />
                    </View>
                    <ThemedText style={styles.progressPercent}>{item.percentage}%</ThemedText>
                  </View>
                )}
              </View>
            ))}
            {!feriaStats.length && (
              <ThemedText style={styles.emptyText}>
                No hay tickets activos para este periodo.
              </ThemedText>
            )}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: theme.success }]} />
                <ThemedText style={styles.legendText}>% de uso</ThemedText>
              </View>
            </View>
          </ThemedView>

          <ThemedView type="card" style={[styles.chartContainer, isLargeScreen && styles.chartContainerLarge]}>
            <ThemedText type="subtitle" style={styles.chartTitle}>Distribución de Uso</ThemedText>
            {pieTotal > 0 ? (
              <View>
                <View
                  accessible
                  accessibilityLabel={`${usedPercent}% usados y ${unusedPercent}% no usados`}
                  style={[styles.distributionTrack, { backgroundColor: `${theme.border}66` }]}
                >
                  {totalUsed > 0 && (
                    <View
                      style={[
                        styles.distributionSegment,
                        {
                          flex: totalUsed,
                          backgroundColor: theme.success,
                        },
                      ]}
                    />
                  )}
                  {totalUnused > 0 && (
                    <View
                      style={[
                        styles.distributionSegment,
                        {
                          flex: totalUnused,
                          backgroundColor: theme.warning,
                        },
                      ]}
                    />
                  )}
                </View>

                <View style={styles.distributionLegend}>
                  <View style={styles.distributionLegendItem}>
                    <View style={[styles.legendColor, { backgroundColor: theme.success }]} />
                    <View>
                      <ThemedText style={styles.distributionValue}>
                        {totalUsed} · {usedPercent}%
                      </ThemedText>
                      <ThemedText style={styles.distributionLabel}>Usados</ThemedText>
                    </View>
                  </View>
                  <View style={styles.distributionLegendItem}>
                    <View style={[styles.legendColor, { backgroundColor: theme.warning }]} />
                    <View>
                      <ThemedText style={styles.distributionValue}>
                        {totalUnused} · {unusedPercent}%
                      </ThemedText>
                      <ThemedText style={styles.distributionLabel}>No usados</ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            ) : (
              <ThemedText style={styles.emptyText}>
                Aún no hay cantidades válidas para dibujar la gráfica.
              </ThemedText>
            )}
          </ThemedView>

          <ThemedView type="card" style={[styles.summaryContainer, isLargeScreen && styles.summaryContainerLarge]}>
            <ThemedText type="subtitle" style={styles.chartTitle}>Resumen por Feria</ThemedText>
            {feriaStats.map(item => (
              <ThemedView type="card" key={item.id} style={styles.summaryItem}>
                <ThemedText type="subtitle" style={styles.feriaName}>{item.label}</ThemedText>
                <View style={styles.summaryStats}>
                  <ThemedText style={styles.statText}>Generados: <ThemedText style={{ color: theme.buttonPrimary }}>{item.generated}</ThemedText></ThemedText>
                  <ThemedText style={[styles.statText, { color: theme.success }]}>Usados: {item.used}</ThemedText>
                  <ThemedText style={[styles.statText, { color: theme.warning }]}>No usados: {item.unused}</ThemedText>
                  {item.inconsistent && (
                    <Ionicons name="warning" size={18} color={theme.error} style={{ marginLeft: 4 }} />
                  )}
                </View>
                {item.inconsistent && (
                  <ThemedText style={[styles.warningText, { color: theme.error }]}>
                    Se registraron más usos ({item.usedRaw}) que tickets generados ({item.generated}).
                  </ThemedText>
                )}
              </ThemedView>
            ))}
          </ThemedView>
        </View>
      </ScrollView>
    </View>
  );
}
