import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationHeader } from '../components/NavigationHeader';
import { Feria } from './tickets';

export default function GraficosFeriasScreen() {
  const [ferias, setFerias] = useState<Feria[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Hook para obtener las áreas seguras
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const isLargeScreen = screenWidth > 768;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://va-server.duckdns.org:3000/api/feria');
      const data = await response.json();
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
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.buttonPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={50} color={theme.error} />
          <ThemedText style={styles.errorTextCentered}>Error al cargar los datos: {error}</ThemedText>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.buttonPrimary }]} 
            onPress={loadData}
          >
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

  const feriasPorMes = filteredFerias.reduce((acc, feria) => {
    const mes = format(new Date(feria.fecha), 'MMMM', { locale: es });
    acc[mes] = (acc[mes] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartConfig = {
    backgroundGradientFrom: theme.background,
    backgroundGradientTo: theme.background,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    labelColor: (opacity = 1) => theme.text,
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.background }]}>
      <NavigationHeader
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={handleYearChange}
      />
      <ScrollView style={styles.scrollView}>
        <View style={[styles.content, isLargeScreen && styles.contentLarge]}>
          <ThemedText type="title" style={styles.title}>Gráficos de Ferias</ThemedText>

          <ThemedView type="card" style={[styles.chartContainer, isLargeScreen && styles.chartContainerLarge]}>
            <ThemedText type="subtitle" style={styles.chartTitle}>Distribución de Ferias</ThemedText>
            <PieChart
              data={Object.entries(feriasPorMes).map(([key, value], index) => ({
                name: key,
                population: value,
                color: `hsl(${index * 60}, 70%, 60%)`,
                legendFontColor: theme.text,
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
          </ThemedView>

          <ThemedView type="card" style={[styles.summaryContainer, isLargeScreen && styles.summaryContainerLarge]}>
            <ThemedText type="subtitle" style={styles.chartTitle}>Resumen por Mes</ThemedText>
            {Object.entries(feriasPorMes).map(([mes, cantidad]) => (
              <ThemedView type="card" key={mes} style={styles.summaryItem}>
                <ThemedText type="subtitle" style={styles.mesName}>{mes}</ThemedText>
                <ThemedText style={[styles.cantidadText, { color: theme.buttonPrimary }]}>{cantidad} ferias</ThemedText>
              </ThemedView>
            ))}
          </ThemedView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
  },
  chartContainerLarge: {
    padding: 24,
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
  },
  summaryContainerLarge: {
    padding: 24,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    borderRadius: 8,
  },
  mesName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cantidadText: {
    fontSize: 16,
    fontWeight: '500',
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