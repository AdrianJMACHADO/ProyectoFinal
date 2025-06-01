import { useRouter } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido a LaUve Tickets</Text>
      <Button title="Ir al Login" onPress={() => router.replace('/login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
}); 