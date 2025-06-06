import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Platform, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { ProgressBar } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationHeader } from '../components/NavigationHeader';
import { Feria, Ticket } from './tickets';

export default function GraficosTicketsScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ferias, setFerias] = useState<Feria[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Hook para obtener las áreas seguras y dimensiones
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = screenWidth > 768; // Detectar pantallas grandes
  const theme = useTheme();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsRes, feriasRes] = await Promise.all([
        fetch('http://va-server.duckdns.org:3000/api/ticket'),
        fetch('http://va-server.duckdns.org:3000/api/feria'),
      ]);
      const ticketsData = await ticketsRes.json();
      const feriasData = await feriasRes.json();
      if (ticketsData.ok && feriasData.ok) {
        setTickets(ticketsData.datos);
        setFerias(feriasData.datos);
        const years: string[] = Array.from(new Set(feriasData.datos.map((feria: Feria) => new Date(feria.fecha).getFullYear().toString())));
        years.sort((a, b) => parseInt(b) - parseInt(a));
        setAvailableYears(['Todas las fechas', ...years]);
        if (selectedYear === null && years.length > 0) {
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
      paddingBottom: 30,
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
  });

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={50} color="#FF3B30" />
          <ThemedText style={styles.errorTextCentered}>Error al cargar los datos: {error}</ThemedText>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <ThemedText style={styles.retryButtonText}>Reintentar</ThemedText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const filteredFerias = selectedYear === 'Todas las fechas'
    ? ferias
    : selectedYear
      ? ferias.filter(feria => new Date(feria.fecha).getFullYear().toString() === selectedYear)
      : ferias;

  const filteredTickets = selectedYear === 'Todas las fechas'
    ? tickets
    : selectedYear
      ? tickets.filter(ticket => {
        const feria = ferias.find(f => f.idFeria === ticket.idFeria);
        return feria && new Date(feria.fecha).getFullYear().toString() === selectedYear;
      })
      : tickets;

  const ticketsActivosFiltered = filteredTickets.filter(t => t.estado === 'ACTIVO');
  const feriaMapFiltered = Object.fromEntries(filteredFerias.map(f => [String(f.idFeria), f.nombre]));
  const feriasUnicasFiltered = Array.from(new Set(ticketsActivosFiltered.map(t => t.idFeria)));
  const feriaLabelsFiltered = feriasUnicasFiltered.map(f => feriaMapFiltered[String(f)] || 'Sin Feria');
  const ticketsPorFeriaFiltered = feriasUnicasFiltered.map(f => ticketsActivosFiltered.filter(t => t.idFeria === f));
  const generadosPorFeriaFiltered = ticketsPorFeriaFiltered.map(arr => arr.reduce((sum, t) => sum + (t.cantidad_inicial || 0), 0));
  const usadosPorFeriaFiltered = ticketsPorFeriaFiltered.map(arr => arr.reduce((sum, t) => sum + Math.min(t.usos || 0, t.cantidad_inicial || 0), 0));
  const noUsadosPorFeriaFiltered = generadosPorFeriaFiltered.map((gen, i) => Math.max(gen - usadosPorFeriaFiltered[i], 0));
  const incoherenciasFiltered = usadosPorFeriaFiltered.map((usados, i) => usados > generadosPorFeriaFiltered[i]);
  const porcentajeUsoPorFeriaFiltered = generadosPorFeriaFiltered.map((gen, i) => gen > 0 ? Math.round((usadosPorFeriaFiltered[i] / gen) * 100) : 0);

  const chartConfig = {
    backgroundGradientFrom: theme.background,
    backgroundGradientTo: theme.background,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => theme.text,
  };

  const barWidth = Math.max(feriaLabelsFiltered.length * 180, screenWidth - 40);

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <NavigationHeader
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
      />
      <ScrollView style={styles.scrollView}>
        <View style={[styles.content, isLargeScreen && styles.contentLarge]}>
          <ThemedText type="title" style={styles.title}>Gráficos de Tickets</ThemedText>

          <ThemedView type="card" style={[styles.chartContainer, isLargeScreen && styles.chartContainerLarge]}>
            <ThemedText type="subtitle" style={styles.chartTitle}>Porcentaje de uso de tickets por Feria</ThemedText>
            {feriasUnicasFiltered.map((feria, i) => (
              <View key={feria || i} style={[styles.progressItem, isLargeScreen && styles.progressItemLarge]}>
                <ThemedText style={[styles.progressLabel, isLargeScreen && styles.progressLabelLarge]}>
                  {feriaLabelsFiltered[i]}
                </ThemedText>
                {isLargeScreen ? (
                  <View style={styles.progressBarRowLarge}>
                    <View style={styles.progressBarContainerLarge}>
                      <ProgressBar
                        progress={generadosPorFeriaFiltered[i] > 0 ? usadosPorFeriaFiltered[i] / generadosPorFeriaFiltered[i] : 0}
                        color={theme.success}
                        style={styles.progressBarLarge}
                      />
                    </View>
                    <ThemedText style={styles.progressPercentLarge}>{porcentajeUsoPorFeriaFiltered[i]}%</ThemedText>
                  </View>
                ) : (
                  <View style={styles.progressBarRow}>
                    <View style={styles.progressBarContainer}>
                      <ProgressBar
                        progress={generadosPorFeriaFiltered[i] > 0 ? usadosPorFeriaFiltered[i] / generadosPorFeriaFiltered[i] : 0}
                        color={theme.success}
                        style={styles.progressBar}
                      />
                    </View>
                    <ThemedText style={styles.progressPercent}>{porcentajeUsoPorFeriaFiltered[i]}%</ThemedText>
                  </View>
                )}
              </View>
            ))}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: theme.success }]} />
                <ThemedText style={styles.legendText}>% de uso</ThemedText>
              </View>
            </View>
          </ThemedView>

          <ThemedView type="card" style={[styles.chartContainer, isLargeScreen && styles.chartContainerLarge]}>
            <ThemedText type="subtitle" style={styles.chartTitle}>Distribución de Uso</ThemedText>
            <PieChart
              data={[
                {
                  name: 'Usados',
                  population: usadosPorFeriaFiltered.reduce((a, b, i) => a + Math.min(b, generadosPorFeriaFiltered[i]), 0),
                  color: `${theme.success}CC`,
                  legendFontColor: theme.text,
                  legendFontSize: 12,
                },
                {
                  name: 'No Usados',
                  population: noUsadosPorFeriaFiltered.reduce((a, b) => a + b, 0),
                  color: `${theme.warning}CC`,
                  legendFontColor: theme.text,
                  legendFontSize: 12,
                }
              ]}
              width={isLargeScreen ? screenWidth - 40 : screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </ThemedView>

          <ThemedView type="card" style={[styles.summaryContainer, isLargeScreen && styles.summaryContainerLarge]}>
            <ThemedText type="subtitle" style={styles.chartTitle}>Resumen por Feria</ThemedText>
            {feriasUnicasFiltered.map((feria, i) => (
              <ThemedView type="card" key={feria || i} style={styles.summaryItem}>
                <ThemedText type="subtitle" style={styles.feriaName}>{feriaLabelsFiltered[i]}</ThemedText>
                <View style={styles.summaryStats}>
                  <ThemedText style={styles.statText}>Generados: <ThemedText style={{ color: theme.buttonPrimary }}>{generadosPorFeriaFiltered[i]}</ThemedText></ThemedText>
                  <ThemedText style={[styles.statText, { color: theme.success }]}>Usados: {usadosPorFeriaFiltered[i]}</ThemedText>
                  <ThemedText style={[styles.statText, { color: theme.warning }]}>No usados: {noUsadosPorFeriaFiltered[i]}</ThemedText>
                  {incoherenciasFiltered[i] && (
                    <Ionicons name="warning" size={18} color={theme.error} style={{ marginLeft: 4 }} />
                  )}
                </View>
                {incoherenciasFiltered[i] && (
                  <ThemedText style={[styles.warningText, { color: theme.error }]}>¡Más usados que generados!</ThemedText>
                )}
              </ThemedView>
            ))}
          </ThemedView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}