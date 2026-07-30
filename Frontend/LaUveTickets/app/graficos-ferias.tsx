import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import {
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useEffect, useMemo, useState } from 'react';
import { Calendar } from 'react-native-calendars';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import FeriaRouteMap from '../components/FeriaRouteMap';
import { NavigationHeaderRegistration } from '../components/NavigationHeaderRegistration';
import { useNavigationChrome } from '../contexts/NavigationChromeContext';
import {
  FeriaRecord,
  listFerias,
  subscribeFerias,
} from '../services/firestoreData';
import { buildFeriaRoute, getFeriaStart } from '../services/feriaTravel';

const FUEL_SETTINGS_KEY = 'lauve.fuelCalculator';
const ROAD_ESTIMATE_FACTOR = 1.18;
const OVERLAP_COLOR = '#FF3B30';
const FAIR_COLORS = [
  '#168BFF',
  '#30D158',
  '#BF5AF2',
  '#FF9F0A',
  '#64D2FF',
  '#FF2D55',
  '#5E5CE6',
  '#A2845E',
];

export default function GraficosFeriasScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { reportScroll } = useNavigationChrome();
  const [ferias, setFerias] = useState<FeriaRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [litresPer100, setLitresPer100] = useState('28');
  const [pricePerLitre, setPricePerLitre] = useState('1.55');
  const [visibleMonth, setVisibleMonth] = useState(
    format(new Date(), 'yyyy-MM'),
  );

  useEffect(() => {
    void AsyncStorage.getItem(FUEL_SETTINGS_KEY).then(value => {
      if (!value) return;
      try {
        const saved = JSON.parse(value);
        setLitresPer100(String(saved.litresPer100 ?? 28));
        setPricePerLitre(String(saved.pricePerLitre ?? 1.55));
      } catch {
        // Conserva los valores iniciales si el almacenamiento está dañado.
      }
    });
    const unsubscribe = subscribeFerias(
      data => {
        setFerias(data);
        setLoading(false);
        setError(null);
      },
      subscriptionError => {
        setError(subscriptionError.message);
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const years = useMemo(
    () =>
      Array.from(
        new Set(ferias.map(feria => String(getFeriaStart(feria).getFullYear()))),
      ).sort((a, b) => Number(b) - Number(a)),
    [ferias],
  );
  const availableYears = useMemo(
    () => ['Todas las fechas', ...years],
    [years],
  );

  useEffect(() => {
    if (selectedYear && availableYears.includes(selectedYear)) return;
    const current = String(new Date().getFullYear());
    setSelectedYear(years.includes(current) ? current : 'Todas las fechas');
  }, [availableYears, selectedYear, years]);

  const filteredFerias = useMemo(
    () =>
      selectedYear === 'Todas las fechas'
        ? ferias
        : ferias.filter(
            feria => String(getFeriaStart(feria).getFullYear()) === selectedYear,
          ),
    [ferias, selectedYear],
  );
  const route = useMemo(() => buildFeriaRoute(filteredFerias), [filteredFerias]);
  const feriaColors = useMemo(
    () =>
      Object.fromEntries(
        [...filteredFerias]
          .sort((a, b) => String(a.idFeria).localeCompare(String(b.idFeria)))
          .map((feria, index) => [
            String(feria.idFeria),
            FAIR_COLORS[index % FAIR_COLORS.length],
          ]),
      ) as Record<string, string>,
    [filteredFerias],
  );
  const calendarMarks = useMemo(
    () =>
      filteredFerias.reduce<
        Record<
          string,
          {
            selected: boolean;
            selectedColor: string;
            dots: { key: string; color: string }[];
          }
        >
      >((marks, feria) => {
        const start = getFeriaStart(feria);
        const end = new Date(
          feria.fechaFin ?? feria.fechaInicio ?? feria.fecha,
        );
        if (
          Number.isNaN(start.getTime()) ||
          Number.isNaN(end.getTime()) ||
          end < start ||
          differenceInCalendarDays(end, start) > 730
        ) {
          return marks;
        }
        eachDayOfInterval({ start, end }).forEach(day => {
          const key = format(day, 'yyyy-MM-dd');
          const dots = [
            ...(marks[key]?.dots ?? []),
            {
              key: String(feria.idFeria),
              color: feriaColors[String(feria.idFeria)],
            },
          ];
          marks[key] = {
            selected: true,
            selectedColor:
              dots.length > 1
                ? OVERLAP_COLOR
                : feriaColors[String(feria.idFeria)],
            dots,
          };
        });
        return marks;
      }, {}),
    [feriaColors, filteredFerias],
  );
  const visibleMonthFerias = useMemo(() => {
    const monthStart = startOfMonth(new Date(`${visibleMonth}-01T12:00:00`));
    const monthEnd = endOfMonth(monthStart);
    return filteredFerias
      .filter(feria => {
        const start = getFeriaStart(feria);
        const end = new Date(
          feria.fechaFin ?? feria.fechaInicio ?? feria.fecha,
        );
        return start <= monthEnd && end >= monthStart;
      })
      .sort(
        (a, b) => getFeriaStart(a).getTime() - getFeriaStart(b).getTime(),
      );
  }, [filteredFerias, visibleMonth]);
  const estimatedRoadKm = route.totalDirectKm * ROAD_ESTIMATE_FACTOR;
  const consumption = Number(litresPer100.replace(',', '.')) || 0;
  const fuelPrice = Number(pricePerLitre.replace(',', '.')) || 0;
  const estimatedLitres = (estimatedRoadKm * consumption) / 100;
  const estimatedCost = estimatedLitres * fuelPrice;

  const feriasPorMes = filteredFerias.reduce<Record<string, number>>(
    (accumulator, feria) => {
      const month = format(getFeriaStart(feria), 'MMMM', { locale: es });
      accumulator[month] = (accumulator[month] ?? 0) + 1;
      return accumulator;
    },
    {},
  );

  const persistCalculator = (nextConsumption: string, nextPrice: string) => {
    void AsyncStorage.setItem(
      FUEL_SETTINGS_KEY,
      JSON.stringify({
        litresPer100: nextConsumption,
        pricePerLitre: nextPrice,
      }),
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.buttonPrimary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Ionicons name="cloud-offline" size={48} color={theme.error} />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity
          style={[styles.retry, { backgroundColor: theme.buttonPrimary }]}
          onPress={async () => {
            setLoading(true);
            try {
              setFerias(await listFerias());
              setError(null);
            } catch (retryError) {
              setError((retryError as Error).message);
            } finally {
              setLoading(false);
            }
          }}
        >
          <ThemedText style={styles.whiteText}>Reintentar</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  const contentWidth = Math.min(width - 32, 980);
  const pieWidth = Math.min(contentWidth - 24, 600);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <NavigationHeaderRegistration
        tab="FeriasStats"
        availableYears={availableYears}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        onScroll={event =>
          reportScroll('FeriasStats', event.nativeEvent.contentOffset.y)
        }
        scrollEventThrottle={16}
      >
        <View style={[styles.content, { width: contentWidth }]}>
          <ThemedText type="title" style={styles.title}>
            Recorrido de Ferias
          </ThemedText>

          <ThemedView type="card" style={styles.card}>
            <View style={styles.cardHeading}>
              <Ionicons
                name="calendar"
                size={24}
                color={theme.buttonPrimary}
              />
              <View style={styles.headingText}>
                <ThemedText type="subtitle">Calendario de ferias</ThemedText>
                <ThemedText style={styles.muted}>
                  Los días naranjas contienen ferias coincidentes.
                </ThemedText>
              </View>
            </View>
            <Calendar
              markedDates={calendarMarks}
              markingType="multi-dot"
              onMonthChange={month =>
                setVisibleMonth(current =>
                  current === month.dateString.slice(0, 7)
                    ? current
                    : month.dateString.slice(0, 7),
                )
              }
              theme={{
                calendarBackground: 'transparent',
                dayTextColor: theme.text,
                monthTextColor: theme.text,
                textDisabledColor: theme.placeholder,
                arrowColor: theme.buttonPrimary,
                todayTextColor: theme.buttonPrimary,
              }}
            />
            <View style={styles.calendarLegend}>
              {visibleMonthFerias.map(feria => (
                <View style={styles.legendItem} key={feria.idFeria}>
                  <View
                    style={[
                      styles.legendDot,
                      {
                        backgroundColor:
                          feriaColors[String(feria.idFeria)],
                      },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.legendName}>
                      {feria.nombre}
                    </ThemedText>
                    <ThemedText style={styles.legendDates}>
                      {format(getFeriaStart(feria), 'dd/MM')}
                      {' – '}
                      {format(
                        new Date(
                          feria.fechaFin ?? feria.fechaInicio ?? feria.fecha,
                        ),
                        'dd/MM',
                      )}
                    </ThemedText>
                  </View>
                </View>
              ))}
              <View style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: OVERLAP_COLOR },
                  ]}
                />
                <ThemedText style={styles.legendName}>
                  Coincidencia de fechas
                </ThemedText>
              </View>
              {!visibleMonthFerias.length && (
                <ThemedText style={styles.emptyMonth}>
                  No hay ferias durante este mes.
                </ThemedText>
              )}
            </View>
          </ThemedView>

          <ThemedView type="card" style={styles.card}>
            <View style={styles.cardHeading}>
              <Ionicons name="map" size={24} color={theme.buttonPrimary} />
              <View style={styles.headingText}>
                <ThemedText type="subtitle">Mapa del recorrido</ThemedText>
                <ThemedText style={styles.muted}>
                  Ordenado por fecha de inicio
                </ThemedText>
              </View>
            </View>
            {route.ferias.length ? (
              <>
                <FeriaRouteMap ferias={route.ferias} />
                <View style={styles.metrics}>
                  <View style={styles.metric}>
                    <ThemedText style={styles.metricValue}>
                      {route.ferias.length}
                    </ThemedText>
                    <ThemedText style={styles.muted}>ferias ubicadas</ThemedText>
                  </View>
                  <View style={styles.metric}>
                    <ThemedText style={styles.metricValue}>
                      {estimatedRoadKm.toFixed(0)} km
                    </ThemedText>
                    <ThemedText style={styles.muted}>
                      carretera estimada
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.disclaimer}>
                  Estimación inicial: distancia geográfica + 18 %. Para rutas
                  exactas por carretera se conectará un proveedor de navegación.
                </ThemedText>
                {route.legs.map(leg => (
                  <View
                    key={`${leg.origin.idFeria}-${leg.destination.idFeria}`}
                    style={[styles.routeLeg, { borderColor: theme.border }]}
                  >
                    <ThemedText style={styles.routeNames}>
                      {leg.origin.nombre} → {leg.destination.nombre}
                    </ThemedText>
                    <ThemedText style={{ color: theme.buttonPrimary }}>
                      {(leg.directKm * ROAD_ESTIMATE_FACTOR).toFixed(0)} km
                    </ThemedText>
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.emptyMap}>
                <Ionicons
                  name="location-outline"
                  size={42}
                  color={theme.placeholder}
                />
                <ThemedText style={styles.emptyText}>
                  Añade ubicación al menos a una feria para verla en el mapa.
                </ThemedText>
              </View>
            )}
          </ThemedView>

          <ThemedView type="card" style={styles.card}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Distribución por meses
            </ThemedText>
            {Object.keys(feriasPorMes).length ? (
              <PieChart
                data={Object.entries(feriasPorMes).map(
                  ([name, population], index) => ({
                    name,
                    population,
                    color: `hsl(${index * 57}, 72%, 58%)`,
                    legendFontColor: theme.text,
                    legendFontSize: 12,
                  }),
                )}
                width={pieWidth}
                height={220}
                chartConfig={{
                  color: opacity => `rgba(22,139,255,${opacity})`,
                  labelColor: () => theme.text,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="10"
                absolute
              />
            ) : (
              <ThemedText style={styles.emptyText}>
                No hay ferias para este periodo.
              </ThemedText>
            )}
          </ThemedView>

          <ThemedView type="card" style={styles.card}>
            <View style={styles.cardHeading}>
              <Ionicons name="calculator" size={24} color="#30D158" />
              <View style={styles.headingText}>
                <ThemedText type="subtitle">Calculadora de combustible</ThemedText>
                <ThemedText style={styles.muted}>
                  Los valores quedan guardados en este dispositivo.
                </ThemedText>
              </View>
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Consumo L/100 km</ThemedText>
                <TextInput
                  value={litresPer100}
                  onChangeText={value => {
                    setLitresPer100(value);
                    persistCalculator(value, pricePerLitre);
                  }}
                  keyboardType="decimal-pad"
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.inputBackground,
                    },
                  ]}
                />
              </View>
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Precio por litro (€)</ThemedText>
                <TextInput
                  value={pricePerLitre}
                  onChangeText={value => {
                    setPricePerLitre(value);
                    persistCalculator(litresPer100, value);
                  }}
                  keyboardType="decimal-pad"
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.inputBackground,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={[styles.result, { backgroundColor: `${theme.success}18` }]}>
              <ThemedText style={styles.resultLabel}>Coste estimado</ThemedText>
              <ThemedText style={[styles.resultValue, { color: theme.success }]}>
                {estimatedCost.toFixed(2)} €
              </ThemedText>
              <ThemedText style={styles.muted}>
                {estimatedLitres.toFixed(1)} litros para{' '}
                {estimatedRoadKm.toFixed(0)} km
              </ThemedText>
            </View>
          </ThemedView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scrollContent: { alignItems: 'center', paddingBottom: 130 },
  content: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },
  title: { textAlign: 'center', color: '#168BFF', marginBottom: 2 },
  card: { borderRadius: 18, padding: 16, overflow: 'hidden' },
  cardHeading: { flexDirection: 'row', gap: 11, alignItems: 'center', marginBottom: 14 },
  headingText: { flex: 1 },
  muted: { opacity: 0.65, fontSize: 13, lineHeight: 18 },
  sectionTitle: { textAlign: 'center', marginBottom: 8 },
  metrics: { flexDirection: 'row', gap: 12, marginTop: 14 },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 24, fontWeight: '800', color: '#168BFF' },
  disclaimer: { fontSize: 12, opacity: 0.65, lineHeight: 17, marginVertical: 12 },
  routeLeg: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeNames: { flex: 1 },
  emptyMap: { minHeight: 180, justifyContent: 'center', alignItems: 'center', gap: 10 },
  emptyText: { textAlign: 'center', opacity: 0.7 },
  inputRow: { flexDirection: 'row', gap: 12 },
  inputGroup: { flex: 1 },
  inputLabel: { fontSize: 13, marginBottom: 7 },
  input: { borderWidth: 1, borderRadius: 11, paddingHorizontal: 12, height: 48 },
  result: { marginTop: 16, padding: 16, borderRadius: 14, alignItems: 'center' },
  resultLabel: { fontWeight: '700' },
  resultValue: { fontSize: 32, fontWeight: '900', marginVertical: 3 },
  errorText: { textAlign: 'center', marginVertical: 16 },
  retry: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12 },
  whiteText: { color: 'white', fontWeight: '700' },
  calendarLegend: {
    gap: 9,
    paddingTop: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { fontWeight: '700' },
  legendDates: { opacity: 0.58, fontSize: 12 },
  emptyMonth: { textAlign: 'center', opacity: 0.6, paddingVertical: 4 },
});
