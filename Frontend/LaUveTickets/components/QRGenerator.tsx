import React from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import QRCode from 'react-native-qrcode-svg';

const BASE_URL = 'http://va-server.duckdns.org:8081';

interface QRGeneratorProps {
  isVisible: boolean;
  onClose: () => void;
  ticketId: number;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({ isVisible, onClose, ticketId }) => {
  const qrValue = `${BASE_URL}/tickets/${ticketId}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Escanea este código QR para acceder al ticket: ${qrValue}`,
      });
    } catch (error) {
      console.error('Error al compartir:', error);
    }
  };

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
    >
      <View style={styles.container}>
        <View style={styles.qrContainer}>
          <QRCode
            value={qrValue}
            size={250}
            backgroundColor="white"
          />
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Text style={styles.buttonText}>Compartir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.buttonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  shareButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginRight: 10,
  },
  closeButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 