import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { ProgressBar } from 'react-native-paper';
import { NavigationHeader } from '../components/NavigationHeader';
import { Feria, Ticket } from './tickets';

export default function GraficosTicketsScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ferias, setFerias] = useState<Feria[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      console.error('Error al cargar los datos:', error);
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="cloud-offline" size={50} color="#FF3B30" />
        <Text style={styles.errorTextCentered}>Error al cargar los datos: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
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
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
  };

  const screenWidth = Dimensions.get('window').width;
  const barWidth = Math.max(feriaLabelsFiltered.length * 180, screenWidth - 40);

  return (
    <View style={styles.container}>
      <NavigationHeader 
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
      />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Gráficos de Tickets</Text>

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Porcentaje de uso de tickets por Feria</Text>
            {feriasUnicasFiltered.map((feria, i) => (
              <View key={feria || i} style={styles.progressItem}>
                <Text style={styles.progressLabel}>{feriaLabelsFiltered[i]}</Text>
                <View style={styles.progressBarRow}>
                  <ProgressBar
                    progress={generadosPorFeriaFiltered[i] > 0 ? usadosPorFeriaFiltered[i] / generadosPorFeriaFiltered[i] : 0}
                    color="#34C759"
                    style={styles.progressBar}
                  />
                  <Text style={styles.progressPercent}>{porcentajeUsoPorFeriaFiltered[i]}%</Text>
                </View>
              </View>
            ))}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}><View style={[styles.legendColor, {backgroundColor:'#34C759'}]} /><Text style={styles.legendText}>% de uso</Text></View>
            </View>
          </View>

          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Distribución de Uso</Text>
            <PieChart
              data={[
                {
                  name: 'Usados',
                  population: usadosPorFeriaFiltered.reduce((a, b, i) => a + Math.min(b, generadosPorFeriaFiltered[i]), 0),
                  color: 'rgba(52, 199, 89, 0.8)',
                  legendFontColor: '#7F7F7F',
                  legendFontSize: 12,
                },
                {
                  name: 'No Usados',
                  population: noUsadosPorFeriaFiltered.reduce((a, b) => a + b, 0),
                  color: 'rgba(255, 149, 0, 0.8)',
                  legendFontColor: '#7F7F7F',
                  legendFontSize: 12,
                }
              ]}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>

          <View style={styles.summaryContainer}>
            <Text style={styles.chartTitle}>Resumen por Feria</Text>
            {feriasUnicasFiltered.map((feria, i) => (
              <View key={feria || i} style={styles.summaryItem}>
                <Text style={styles.feriaName}>{feriaLabelsFiltered[i]}</Text>
                <View style={styles.summaryStats}>
                  <Text style={styles.statText}>Generados: <Text style={{color:'#007AFF'}}>{generadosPorFeriaFiltered[i]}</Text></Text>
                  <Text style={[styles.statText, styles.usedText]}>Usados: {usadosPorFeriaFiltered[i]}</Text>
                  <Text style={[styles.statText, styles.unusedText]}>No usados: {noUsadosPorFeriaFiltered[i]}</Text>
                  {incoherenciasFiltered[i] && (
                    <Ionicons name="warning" size={18} color="#FF3B30" style={{marginLeft:4}} />
                  )}
                </View>
                {incoherenciasFiltered[i] && (
                  <Text style={styles.warningText}>¡Más usados que generados!</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    padding: 10,
    paddingBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    elevation: 2,
  },
  summaryItem: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#f8f8f8',
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
    color: '#666',
  },
  usedText: {
    color: '#34C759',
  },
  unusedText: {
    color: '#FF9500',
  },
  warningText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 2,
    fontWeight: 'bold',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
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
    color: '#333',
  },
  progressItem: {
    marginBottom: 14,
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#333',
  },
  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    marginRight: 8,
  },
  progressPercent: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#34C759',
    minWidth: 40,
    textAlign: 'right',
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