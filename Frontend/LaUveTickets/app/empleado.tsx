import { NavigationHeader } from '@/components/NavigationHeader';
import { QRScannerModal } from '@/components/QRScannerModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useFirebaseConfig } from '@/contexts/FirebaseConfigContext';
import { useTheme } from '@/hooks/useThemeColor';
import { getTicketByQrCredential } from '@/services/firestoreData';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function EmployeeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { config } = useFirebaseConfig();
  const [scannerVisible, setScannerVisible] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <NavigationHeader />

      <View style={styles.content}>
        <ThemedView type="card" style={styles.card}>
          <Image
            source={require('../assets/images/v.png')}
            style={styles.logo}
            resizeMode="cover"
          />
          <ThemedText type="title" style={styles.title}>
            Modo empleado
          </ThemedText>
          <ThemedText style={styles.description}>
            Escanea el código QR que te entregue el cliente. Podrás comprobar
            el ticket y añadir un uso si continúa disponible.
          </ThemedText>
          <View
            style={[
              styles.hint,
              { backgroundColor: `${theme.buttonPrimary}18` },
            ]}
          >
            <Ionicons name="scan" size={24} color={theme.buttonPrimary} />
            <ThemedText
              style={[styles.hintText, { color: theme.buttonPrimary }]}
            >
              Pulsa el botón azul para comenzar
            </ThemedText>
          </View>
        </ThemedView>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Escanear código QR"
        style={[
          styles.scanButton,
          {
            bottom: Math.max(insets.bottom, 12) + 18,
            backgroundColor: theme.buttonPrimary,
            shadowColor: theme.shadow,
          },
        ]}
        onPress={() => setScannerVisible(true)}
      >
        <Ionicons name="scan" size={30} color="white" />
      </TouchableOpacity>

      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onTicketScanned={async (ticketId, qrToken) => {
          try {
            const ticket = await getTicketByQrCredential(ticketId, qrToken);
            if (!ticket) return false;
            setScannerVisible(false);
            setTimeout(() => router.push(`/tickets/${ticketId}`), 220);
            return true;
          } catch {
            return false;
          }
        }}
        projectId={config?.projectId || ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 54,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    borderRadius: 22,
    paddingHorizontal: 28,
    paddingVertical: 34,
  },
  logo: {
    width: 94,
    height: 94,
    borderRadius: 24,
    marginBottom: 22,
  },
  title: { textAlign: 'center', marginBottom: 14 },
  description: {
    textAlign: 'center',
    opacity: 0.78,
    lineHeight: 23,
  },
  hint: {
    width: '100%',
    marginTop: 26,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  hintText: {
    flexShrink: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  scanButton: {
    position: 'absolute',
    left: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 7,
  },
});
