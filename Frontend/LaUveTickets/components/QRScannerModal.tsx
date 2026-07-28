import { Ionicons } from '@expo/vector-icons';
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useThemeColor';
import { ThemedText } from './ThemedText';

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onTicketScanned: (ticketId: number, qrToken: string) => Promise<boolean>;
  projectId: string;
}

type SecureTicketQr = { ticketId: number; qrToken: string };

const parseTicketQr = (
  value: string,
  expectedProjectId: string,
): SecureTicketQr | null => {
  const match = value
    .trim()
    .match(
      /^lauvetickets:\/\/projects\/([^/]+)\/tickets\/(\d+)\/access\/([a-f0-9]{64})$/i,
    );
  if (!match) return null;
  if (decodeURIComponent(match[1]) !== expectedProjectId) return null;

  const ticketId = Number(match[2]);
  return Number.isSafeInteger(ticketId) && ticketId > 0
    ? { ticketId, qrToken: match[3].toLowerCase() }
    : null;
};

export function QRScannerModal({
  visible,
  onClose,
  onTicketScanned,
  projectId,
}: QRScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setScanError(null);
    }
  }, [visible]);

  const handleBarcodeScanned = async ({ data }: BarcodeScanningResult) => {
    if (scanned) return;

    setScanned(true);
    const credential = parseTicketQr(data, projectId);
    if (!credential) {
      setScanError('QR no válido, antiguo o de otro negocio');
      setTimeout(() => {
        setScanned(false);
        setScanError(null);
      }, 1600);
      return;
    }

    const valid = await onTicketScanned(
      credential.ticketId,
      credential.qrToken,
    );
    if (valid) {
      onClose();
      return;
    }

    setScanError('El código del ticket no es válido o ha sido modificado');
    setTimeout(() => {
      setScanned(false);
      setScanError(null);
    }, 2000);
  };

  const renderPermissionContent = () => {
    if (!permission) {
      return <ActivityIndicator size="large" color={theme.buttonPrimary} />;
    }

    if (!permission.granted) {
      return (
        <View style={styles.permissionContent}>
          <Ionicons name="camera-outline" size={64} color={theme.buttonPrimary} />
          <ThemedText type="subtitle" style={styles.permissionTitle}>
            Permiso de cámara
          </ThemedText>
          <ThemedText style={styles.permissionText}>
            La cámara se utiliza únicamente para leer los códigos QR de los tickets.
          </ThemedText>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: theme.buttonPrimary }]}
            onPress={requestPermission}
          >
            <ThemedText type="button" style={styles.whiteText}>
              Permitir cámara
            </ThemedText>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      >
        <View style={styles.cameraOverlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <ThemedText style={styles.scanHint}>
            Coloca el código QR dentro del recuadro
          </ThemedText>
          {scanError && (
            <View style={styles.errorBanner}>
              <Ionicons name="warning" size={20} color="white" />
              <ThemedText style={styles.whiteText}>{scanError}</ThemedText>
            </View>
          )}
        </View>
      </CameraView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: theme.background, paddingTop: insets.top },
        ]}
      >
        {renderPermissionContent()}
        <TouchableOpacity
          accessibilityLabel="Cerrar lector QR"
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={onClose}
        >
          <Ionicons name="close" size={30} color="white" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 5,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  permissionContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    marginTop: 18,
    marginBottom: 10,
  },
  permissionText: {
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 24,
  },
  permissionButton: {
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  cameraOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  scanFrame: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderColor: '#2F80FF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 5,
    borderBottomWidth: 5,
    borderBottomRightRadius: 12,
  },
  scanHint: {
    marginTop: 28,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.92)',
  },
  whiteText: {
    color: 'white',
  },
});
