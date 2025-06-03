import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { NavigationHeader } from '../components/NavigationHeader';
import { Feria } from './tickets';

export default function GraficosFeriasScreen() {
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
      const res = await fetch('http://va-server.duckdns.org:3000/api/feria');
      const data = await res.json();
      if (data.ok) {
        setFerias(data.datos);
        const years: string[] = Array.from(new Set(data.datos.map((feria: Feria) => new Date(feria.fecha).getFullYear().toString())));
        years.sort((a, b) => parseInt(b) - parseInt(a));
        setAvailableYears(['Todas las fechas', ...years]);
        if (selectedYear === null && years.length > 0) {
          setSelectedYear(years[0]);
        } else {
          setSelectedYear('Todas las fechas');
        }
        setError(null);
      } else {
        const errorMessage = data.mensaje || 'Error al cargar los datos (API)';
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

  const feriasPorMes = filteredFerias.reduce((acc, feria) => {
    const mes = format(new Date(feria.fecha), 'MMMM');
    acc[mes] = (acc[mes] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={styles.container}>
      <NavigationHeader 
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
      />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Gráficos de Ferias</Text>

          {/* Gráfico de Distribución de Ferias */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Distribución de Ferias</Text>
            <PieChart
              data={Object.entries(feriasPorMes).map(([key, value], index) => ({
                name: key,
                population: value,
                color: `hsl(${index * 60}, 40%, 60%)`,
                legendFontColor: '#7F7F7F',
                legendFontSize: 12,
              }))}
              width={screenWidth - 40}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>

          {/* Resumen por Mes */}
          <View style={styles.summaryContainer}>
            <Text style={styles.chartTitle}>Resumen por Mes</Text>
            {Object.entries(feriasPorMes).map(([mes, cantidad]) => (
              <View key={mes} style={styles.summaryItem}>
                <Text style={styles.mesName}>{mes}</Text>
                <Text style={styles.cantidadText}>{cantidad} ferias</Text>
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
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  mesName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cantidadText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
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