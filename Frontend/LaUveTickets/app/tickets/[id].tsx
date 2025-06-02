import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { NavigationHeader } from '../../components/NavigationHeader';
import { Ticket } from '../tickets';

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadTicket = async () => {
      try {
        const res = await fetch(`http://va-server.duckdns.org:3000/api/ticket/${id}`);
        const data = await res.json();
        if (data.ok) {
          setTicket(data.datos);
        } else {
          throw new Error('Error al cargar el ticket');
        }
      } catch (error) {
        Alert.alert('Error', 'No se pudo cargar el ticket');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    loadTicket();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.center}>
        <Text>Ticket no encontrado</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationHeader />
      <View style={styles.details}>
        <Text style={styles.label}>Nombre:</Text>
        <Text style={styles.value}>{ticket.nombre}</Text>

        <Text style={styles.label}>Tipo:</Text>
        <Text style={styles.value}>{ticket.tipo}</Text>

        <Text style={styles.label}>Estado:</Text>
        <Text style={styles.value}>{ticket.estado}</Text>

        <Text style={styles.label}>Cantidad Inicial:</Text>
        <Text style={styles.value}>{ticket.cantidad_inicial}</Text>

        <Text style={styles.label}>Usos:</Text>
        <Text style={styles.value}>{ticket.usos ?? 0}</Text>

        <Text style={styles.label}>Fecha de Creación:</Text>
        <Text style={styles.value}>
          {ticket.fecha_creacion ? format(new Date(ticket.fecha_creacion), 'dd/MM/yyyy') : '-'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    padding: 20,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 10,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#666',
  },
  value: {
    fontSize: 18,
    marginBottom: 10,
  },
}); 