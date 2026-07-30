import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { FeriaWithLocation } from '../services/feriaTravel';

export default function FeriaRouteMap({
  ferias,
}: {
  ferias: FeriaWithLocation[];
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recorrido geográfico</Text>
      {ferias.map((feria, index) => (
        <Text key={feria.idFeria} style={styles.item}>
          {index + 1}. {feria.nombre}
          {feria.ubicacionNombre ? ` · ${feria.ubicacionNombre}` : ''}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 180,
    borderWidth: 1,
    borderColor: '#44444A',
    borderRadius: 16,
    padding: 18,
  },
  title: { color: '#168BFF', fontSize: 18, fontWeight: '800', marginBottom: 10 },
  item: { color: '#D8D8DC', marginBottom: 7 },
});
