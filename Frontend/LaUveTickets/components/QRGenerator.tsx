import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import QRCode from 'react-native-qrcode-svg';

const BASE_URL = 'http://va-server.duckdns.org:8081';

interface QRGeneratorProps {
  isVisible: boolean;
  onClose: () => void;
  ticketId: number;
  nombre: string;
  tipo: string;
  cantidadInicial: number;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({ isVisible, onClose, ticketId, nombre, tipo, cantidadInicial }) => {
  const qrValue = `lauvetickets://tickets/${ticketId}`;
  const qrCodeRef = useRef<any>(null);
  const [isSharing, setIsSharing] = useState(false);

  const getBase64QR = async (): Promise<string> => {
    if (!qrCodeRef.current) {
      throw new Error('QR code ref not available');
    }
    return new Promise((resolve, reject) => {
      qrCodeRef.current.toDataURL(async (dataURL: string) => {
        const filename = `${FileSystem.cacheDirectory}qr_code_${ticketId}.png`;
        try {
          await FileSystem.writeAsStringAsync(filename, dataURL, { encoding: FileSystem.EncodingType.Base64 });
          const fileUri = FileSystem.cacheDirectory + `qr_code_${ticketId}.png`;
          const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
          resolve(`data:image/png;base64,${base64}`);
        } catch (error) {
          console.error('Error handling QR file:', error);
          reject(new Error('No se pudo guardar o leer el archivo QR'));
        }
      });
    });
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      const qrCodeBase64 = await getBase64QR();

      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 20px;
              }
              h1 {
                color: #000;
                font-size: 36px;
                margin-bottom: 5px;
              }
              .label {
                font-size: 18px;
                font-weight: bold;
                margin-top: 15px;
                margin-bottom: 5px;
              }
              .value {
                font-size: 18px;
                margin-bottom: 10px;
              }
              .qrContainer {
                margin-top: 30px;
                display: flex;
                justifyContent: center;
                alignItems: center;
              }
              img {
                width: 250px;
                height: 250px;
              }
            </style>
          </head>
          <body>
            <h1>LA UVE</h1>
            <p class="label">Nombre:</p>
            <p class="value">${nombre}</p>
            <p class="label">Tipo:</p>
            <p class="value">${tipo}</p>
            <p class="label">Cantidad Inicial:</p>
            <p class="value">${cantidadInicial}</p>
            <div class="qrContainer">
              <img src="${qrCodeBase64}" style="display: block; margin: 0 auto;" />
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Error al generar o compartir el PDF:', error);
      Alert.alert('Error', 'No se pudo generar o compartir el PDF');
    } finally {
      setIsSharing(false);
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
            getRef={(c) => qrCodeRef.current = c}
          />
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.shareButton} 
            onPress={handleShare}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Compartir PDF</Text>
            )}
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
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 