import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { FeriaLocationValue } from './FeriaLocationPicker.native';

export type { FeriaLocationValue };

export default function FeriaLocationPicker({
  value,
}: {
  value?: FeriaLocationValue;
  onChange: (value: FeriaLocationValue) => void;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selección de ubicación</Text>
      <Text style={styles.text}>
        Abre esta feria desde iPhone o Android para elegir la ubicación en el
        mapa.
      </Text>
      {value && (
        <Text style={styles.value}>
          {value.ubicacionNombre ||
            `${value.latitud.toFixed(5)}, ${value.longitud.toFixed(5)}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#4B4B52',
    borderRadius: 12,
    padding: 14,
  },
  title: { color: '#168BFF', fontWeight: '700', marginBottom: 5 },
  text: { color: '#A8A8AE' },
  value: { color: 'white', marginTop: 8 },
});
