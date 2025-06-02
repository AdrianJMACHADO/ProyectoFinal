import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { ProgressBar } from 'react-native-paper';
import { NavigationHeader } from '../components/NavigationHeader';
import { Feria, Ticket } from './tickets';

export default function GraficosTicketsScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ferias, setFerias] = useState<Feria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
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
      }
    } catch (error) {
      console.error('Error al cargar los datos:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Filtrar solo tickets activos
  const ticketsActivos = tickets.filter(t => t.estado === 'ACTIVO');
  // Agrupar por feria y obtener nombre
  const feriaMap = Object.fromEntries(ferias.map(f => [String(f.idFeria), f.nombre]));
  const feriasUnicas = Array.from(new Set(ticketsActivos.map(t => t.idFeria)));
  const feriaLabels = feriasUnicas.map(f => feriaMap[String(f)] || 'Sin Feria');
  const ticketsPorFeria = feriasUnicas.map(f => ticketsActivos.filter(t => t.idFeria === f));
  // Calcular generados y usados correctamente
  const generadosPorFeria = ticketsPorFeria.map(arr => arr.reduce((sum, t) => sum + (t.cantidad_inicial || 0), 0));
  const usadosPorFeria = ticketsPorFeria.map(arr => arr.reduce((sum, t) => sum + Math.min(t.usos || 0, t.cantidad_inicial || 0), 0));
  const noUsadosPorFeria = generadosPorFeria.map((gen, i) => Math.max(gen - usadosPorFeria[i], 0));
  const incoherencias = usadosPorFeria.map((usados, i) => usados > generadosPorFeria[i]);
  // Calcular porcentaje de uso por feria
  const porcentajeUsoPorFeria = generadosPorFeria.map((gen, i) => gen > 0 ? Math.round((usadosPorFeria[i] / gen) * 100) : 0);

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
  const barWidth = Math.max(feriaLabels.length * 180, screenWidth - 40);

  return (
    <View style={styles.container}>
      <NavigationHeader />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Gráficos de Tickets</Text>

          {/* Porcentaje de uso por Feria (barra de progreso) */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Porcentaje de uso de tickets por Feria</Text>
            {feriasUnicas.map((feria, i) => (
              <View key={feria || i} style={styles.progressItem}>
                <Text style={styles.progressLabel}>{feriaLabels[i]}</Text>
                <View style={styles.progressBarRow}>
                  <ProgressBar
                    progress={generadosPorFeria[i] > 0 ? usadosPorFeria[i] / generadosPorFeria[i] : 0}
                    color="#34C759"
                    style={styles.progressBar}
                  />
                  <Text style={styles.progressPercent}>{porcentajeUsoPorFeria[i]}%</Text>
                </View>
              </View>
            ))}
            <View style={styles.legendRow}>
              <View style={styles.legendItem}><View style={[styles.legendColor, {backgroundColor:'#34C759'}]} /><Text style={styles.legendText}>% de uso</Text></View>
            </View>
          </View>

          {/* Gráfico de Distribución de Uso */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Distribución de Uso</Text>
            <PieChart
              data={[
                {
                  name: 'Usados',
                  population: usadosPorFeria.reduce((a, b, i) => a + Math.min(b, generadosPorFeria[i]), 0),
                  color: 'rgba(52, 199, 89, 0.8)',
                  legendFontColor: '#7F7F7F',
                  legendFontSize: 12,
                },
                {
                  name: 'No Usados',
                  population: noUsadosPorFeria.reduce((a, b) => a + b, 0),
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

          {/* Resumen por Feria */}
          <View style={styles.summaryContainer}>
            <Text style={styles.chartTitle}>Resumen por Feria</Text>
            {feriasUnicas.map((feria, i) => (
              <View key={feria || i} style={styles.summaryItem}>
                <Text style={styles.feriaName}>{feriaLabels[i]}</Text>
                <View style={styles.summaryStats}>
                  <Text style={styles.statText}>Generados: <Text style={{color:'#007AFF'}}>{generadosPorFeria[i]}</Text></Text>
                  <Text style={[styles.statText, styles.usedText]}>Usados: {usadosPorFeria[i]}</Text>
                  <Text style={[styles.statText, styles.unusedText]}>No usados: {noUsadosPorFeria[i]}</Text>
                  {incoherencias[i] && (
                    <Ionicons name="warning" size={18} color="#FF3B30" style={{marginLeft:4}} />
                  )}
                </View>
                {incoherencias[i] && (
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
}); 