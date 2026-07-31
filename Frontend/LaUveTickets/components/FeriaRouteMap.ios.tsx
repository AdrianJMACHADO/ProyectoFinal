import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, type LatLng, type Region } from 'react-native-maps';
import type { FeriaWithLocation } from '../services/feriaTravel';

type Props = {
  ferias: FeriaWithLocation[];
};

type ValidFeria = FeriaWithLocation & {
  latitud: number;
  longitud: number;
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const normalizeFeria = (
  feria: FeriaWithLocation,
): ValidFeria | null => {
  const latitude = toFiniteNumber(feria.latitud);
  const longitude = toFiniteNumber(feria.longitud);

  if (
    latitude === null ||
    longitude === null ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    ...feria,
    latitud: latitude,
    longitud: longitude,
  };
};

const buildRegion = (coordinates: LatLng[]): Region => {
  const latitudes = coordinates.map(point => point.latitude);
  const longitudes = coordinates.map(point => point.longitude);

  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.35, 0.08),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.35, 0.08),
  };
};

export default function FeriaRouteMap({ ferias }: Props) {
  const validFerias = useMemo(
    () =>
      ferias
        .map(normalizeFeria)
        .filter((feria): feria is ValidFeria => feria !== null),
    [ferias],
  );

  const coordinates = useMemo<LatLng[]>(
    () =>
      validFerias.map(feria => ({
        latitude: feria.latitud,
        longitude: feria.longitud,
      })),
    [validFerias],
  );

  const initialRegion = useMemo(
    () => (coordinates.length ? buildRegion(coordinates) : null),
    [coordinates],
  );

  if (!initialRegion) {
    return (
      <View style={[styles.frame, styles.empty]}>
        <Text style={styles.emptyText}>
          No hay coordenadas válidas para mostrar el mapa.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        loadingEnabled
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        showsUserLocation={false}
        showsMyLocationButton={false}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {validFerias.map((feria, index) => (
          <Marker
            key={`${String(feria.idFeria)}-${index}`}
            coordinate={coordinates[index]}
            title={`${index + 1}. ${String(feria.nombre ?? 'Feria')}`}
            description={
              feria.ubicacionNombre
                ? String(feria.ubicacionNombre)
                : undefined
            }
          />
        ))}

        {coordinates.length > 1 && (
          <Polyline
            coordinates={coordinates}
            strokeColor="#168BFF"
            strokeWidth={4}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    minHeight: 320,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#202024',
  },
  map: {
    width: '100%',
    height: 320,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#D8D8DC',
    textAlign: 'center',
  },
});
