import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { MapPressEvent, Marker, Region } from 'react-native-maps';

export type FeriaLocationValue = {
  latitud: number;
  longitud: number;
  ubicacionNombre?: string;
  ubicacionOrigen: 'DISPOSITIVO' | 'MAPA';
};

type Props = {
  value?: FeriaLocationValue;
  onChange: (value: FeriaLocationValue) => void;
};

const SPAIN_REGION: Region = {
  latitude: 40.4168,
  longitude: -3.7038,
  latitudeDelta: 8,
  longitudeDelta: 8,
};

const describeLocation = async (latitude: number, longitude: number) => {
  try {
    const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
    return [address?.city, address?.subregion, address?.region]
      .filter(Boolean)
      .filter((part, index, list) => list.indexOf(part) === index)
      .slice(0, 2)
      .join(', ');
  } catch {
    return '';
  }
};

export default function FeriaLocationPicker({ value, onChange }: Props) {
  const mapRef = useRef<MapView>(null);
  const [locating, setLocating] = useState(false);
  const initialRegion = value
    ? {
        latitude: value.latitud,
        longitude: value.longitud,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }
    : SPAIN_REGION;

  useEffect(() => {
    if (!value) return;
    mapRef.current?.animateToRegion(
      {
        latitude: value.latitud,
        longitude: value.longitud,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      },
      250,
    );
  }, [value?.latitud, value?.longitud]);

  const setCoordinates = async (
    latitude: number,
    longitude: number,
    origin: FeriaLocationValue['ubicacionOrigen'],
  ) => {
    const ubicacionNombre = await describeLocation(latitude, longitude);
    onChange({
      latitud: latitude,
      longitud: longitude,
      ubicacionNombre,
      ubicacionOrigen: origin,
    });
  };

  const useDeviceLocation = async () => {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert(
          'Permiso necesario',
          'Activa el permiso de ubicación para usar la posición del dispositivo.',
        );
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await setCoordinates(
        current.coords.latitude,
        current.coords.longitude,
        'DISPOSITIVO',
      );
    } catch (error) {
      Alert.alert(
        'No se pudo obtener la ubicación',
        (error as Error).message,
      );
    } finally {
      setLocating(false);
    }
  };

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    void setCoordinates(latitude, longitude, 'MAPA');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.locationButton}
        onPress={useDeviceLocation}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator color="white" />
        ) : (
          <Ionicons name="locate" size={20} color="white" />
        )}
        <Text style={styles.buttonText}>
          {locating ? 'Buscando ubicación…' : 'Usar mi ubicación actual'}
        </Text>
      </TouchableOpacity>
      <Text style={styles.help}>
        También puedes tocar directamente el mapa para colocar la feria.
      </Text>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        onPress={handleMapPress}
        showsUserLocation
      >
        {value && (
          <Marker
            coordinate={{
              latitude: value.latitud,
              longitude: value.longitud,
            }}
            title={value.ubicacionNombre || 'Ubicación de la feria'}
          />
        )}
      </MapView>
      {value && (
        <View style={styles.selection}>
          <Ionicons name="location" size={18} color="#168BFF" />
          <Text style={styles.selectionText}>
            {value.ubicacionNombre ||
              `${value.latitud.toFixed(5)}, ${value.longitud.toFixed(5)}`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  locationButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#168BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 15 },
  help: { color: '#9B9BA1', fontSize: 12, lineHeight: 17 },
  map: { width: '100%', height: 220, borderRadius: 14 },
  selection: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  selectionText: { flex: 1, color: '#D8D8DC', fontSize: 13 },
});
