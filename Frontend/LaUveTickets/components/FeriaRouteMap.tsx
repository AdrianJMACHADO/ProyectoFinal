import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  InteractionManager,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  Region,
} from 'react-native-maps';
import type { FeriaRecord } from '../services/firestoreData';

type FeriaRouteMapProps = {
  ferias: FeriaRecord[];
};

type SafeMapPoint = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

const MIN_LATITUDE_DELTA = 0.06;
const MIN_LONGITUDE_DELTA = 0.06;
const MAX_LATITUDE_DELTA = 120;
const MAX_LONGITUDE_DELTA = 180;

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const readCoordinatePair = (
  source: unknown,
): { latitude: number; longitude: number } | null => {
  if (!source || typeof source !== 'object') return null;

  const value = source as Record<string, unknown>;
  const latitude = toFiniteNumber(
    value.latitude ??
      value.latitud ??
      value.lat ??
      value._latitude ??
      value._lat,
  );
  const longitude = toFiniteNumber(
    value.longitude ??
      value.longitud ??
      value.lng ??
      value.lon ??
      value._longitude ??
      value._long,
  );

  if (latitude == null || longitude == null) return null;
  if (latitude < -90 || latitude > 90) return null;
  if (longitude < -180 || longitude > 180) return null;

  return { latitude, longitude };
};

const getFeriaCoordinate = (
  feria: FeriaRecord,
): { latitude: number; longitude: number } | null => {
  const record = feria as unknown as Record<string, unknown>;

  const direct = readCoordinatePair(record);
  if (direct) return direct;

  const nestedCandidates = [
    record.ubicacion,
    record.location,
    record.coordenadas,
    record.coordinate,
    record.coordinates,
    record.geoPoint,
    record.geopoint,
    record.posicion,
    record.position,
  ];

  for (const candidate of nestedCandidates) {
    const coordinate = readCoordinatePair(candidate);
    if (coordinate) return coordinate;
  }

  // Firestore GeoPoint serializado o GeoJSON: { coordinates: [lng, lat] }.
  const geoJsonCoordinates =
    record.coordinates &&
    typeof record.coordinates === 'object' &&
    !Array.isArray(record.coordinates)
      ? (record.coordinates as Record<string, unknown>).coordinates
      : record.coordinates;

  if (Array.isArray(geoJsonCoordinates) && geoJsonCoordinates.length >= 2) {
    const longitude = toFiniteNumber(geoJsonCoordinates[0]);
    const latitude = toFiniteNumber(geoJsonCoordinates[1]);

    if (
      latitude != null &&
      longitude != null &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      return { latitude, longitude };
    }
  }

  return null;
};

const buildInitialRegion = (points: SafeMapPoint[]): Region => {
  const latitudes = points.map(point => point.latitude);
  const longitudes = points.map(point => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  const latitudeDelta = Math.min(
    Math.max((maxLatitude - minLatitude) * 1.45, MIN_LATITUDE_DELTA),
    MAX_LATITUDE_DELTA,
  );
  const longitudeDelta = Math.min(
    Math.max((maxLongitude - minLongitude) * 1.45, MIN_LONGITUDE_DELTA),
    MAX_LONGITUDE_DELTA,
  );

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta,
    longitudeDelta,
  };
};

export default function FeriaRouteMap({ ferias }: FeriaRouteMapProps) {
  const isFocused = useIsFocused();
  const [mayMountNativeMap, setMayMountNativeMap] = useState(false);

  // El pager puede enfocar la pantalla durante el gesto. Esperamos a que termine
  // la interacción y, una vez montado, no destruimos el MapView al deslizar fuera.
  useEffect(() => {
    if (!isFocused || mayMountNativeMap) return;

    const task = InteractionManager.runAfterInteractions(() => {
      setMayMountNativeMap(true);
    });

    return () => task.cancel();
  }, [isFocused, mayMountNativeMap]);

  const points = useMemo<SafeMapPoint[]>(() => {
    const seen = new Set<string>();

    return ferias.flatMap((feria, index) => {
      const coordinate = getFeriaCoordinate(feria);
      if (!coordinate) return [];

      const coordinateKey = `${coordinate.latitude.toFixed(6)}:${coordinate.longitude.toFixed(6)}`;
      const rawId = String(feria.idFeria ?? index);
      const id = `${rawId}:${coordinateKey}`;
      if (seen.has(id)) return [];
      seen.add(id);

      return [
        {
          id,
          name: String(feria.nombre ?? `Feria ${index + 1}`),
          ...coordinate,
        },
      ];
    });
  }, [ferias]);

  const initialRegion = useMemo(
    () => (points.length ? buildInitialRegion(points) : null),
    [points],
  );

  if (!points.length || !initialRegion) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>No hay ubicaciones válidas</Text>
        <Text style={styles.fallbackText}>
          Revisa que cada feria tenga latitud y longitud numéricas.
        </Text>
      </View>
    );
  }

  if (!mayMountNativeMap) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Preparando mapa…</Text>
      </View>
    );
  }

  const polylineCoordinates = points.map(({ latitude, longitude }) => ({
    latitude,
    longitude,
  }));

  return (
    <View style={styles.container} collapsable={false}>
      <MapView
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        mapType="standard"
        loadingEnabled
        moveOnMarkerPress={false}
        pitchEnabled={false}
        rotateEnabled={false}
        toolbarEnabled={false}
      >
        {polylineCoordinates.length >= 2 && (
          <Polyline
            coordinates={polylineCoordinates}
            strokeWidth={4}
            strokeColor="#168BFF"
            geodesic
          />
        )}

        {points.map((point, index) => (
          <Marker
            key={point.id}
            coordinate={{
              latitude: point.latitude,
              longitude: point.longitude,
            }}
            title={`${index + 1}. ${point.name}`}
            description={`${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`}
            tracksViewChanges={false}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 300,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  fallback: {
    width: '100%',
    minHeight: 180,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(127,127,127,0.10)',
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  fallbackText: {
    marginTop: 6,
    fontSize: 13,
    opacity: 0.7,
    textAlign: 'center',
  },
});
