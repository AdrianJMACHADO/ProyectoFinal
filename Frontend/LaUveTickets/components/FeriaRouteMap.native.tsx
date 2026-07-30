import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { FeriaWithLocation } from '../services/feriaTravel';

export default function FeriaRouteMap({
  ferias,
}: {
  ferias: FeriaWithLocation[];
}) {
  if (!ferias.length) return null;
  const coordinates = ferias.map(feria => ({
    latitude: feria.latitud,
    longitude: feria.longitud,
  }));
  const latitudes = coordinates.map(point => point.latitude);
  const longitudes = coordinates.map(point => point.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const initialRegion = {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.35, 0.08),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.35, 0.08),
  };
  return (
    <View style={styles.frame}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {ferias.map((feria, index) => (
          <Marker
            key={feria.idFeria}
            coordinate={coordinates[index]}
            title={`${index + 1}. ${feria.nombre}`}
            description={feria.ubicacionNombre}
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
  frame: { borderRadius: 16, overflow: 'hidden' },
  map: { width: '100%', height: 320 },
});
