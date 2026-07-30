import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Modal from 'react-native-modal';
import QRCode from 'react-native-qrcode-svg';
import {
  getPdfBackgroundDataUrl,
  getPdfBusinessName,
} from '../services/pdfTemplate';

// URL web anterior conservada como referencia durante la migración:
// const LEGACY_WEB_URL = 'http://va-server.duckdns.org:8081';

interface QRGeneratorProps {
  isVisible: boolean;
  onClose: () => void;
  ticketId: number;
  qrToken: string;
  nombre: string;
  tipo: string;
  cantidadInicial: number;
  projectId: string;
}

export const ticketQrValue = (
  projectId: string,
  ticketId: number,
  qrToken: string,
) =>
  `lauvetickets://projects/${encodeURIComponent(projectId)}/tickets/${ticketId}/access/${qrToken}`;

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[character]!);

export const createTicketPdf = async ({
  nombre,
  tipo,
  cantidadInicial,
  qrCodeBase64,
}: {
  nombre: string;
  tipo: string;
  cantidadInicial: number;
  qrCodeBase64: string;
}) => {
  const [backgroundDataUrl, businessName] = await Promise.all([
    getPdfBackgroundDataUrl(),
    getPdfBusinessName(),
  ]);

  if (Platform.OS === 'web') {
    const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [1103, 1426],
      hotfixes: ['px_scaling'],
      compress: true,
    });
    const backgroundFormat = backgroundDataUrl.startsWith('data:image/png')
      ? 'PNG'
      : 'JPEG';
    pdf.addImage(backgroundDataUrl, backgroundFormat, 0, 0, 1103, 1426);
    pdf.setTextColor(17, 17, 17);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(30);
    pdf.text(businessName, 551.5, 344, {
      align: 'center',
      baseline: 'middle',
      maxWidth: 470,
    });
    pdf.setFontSize(22);
    pdf.text(nombre, 445, 492, {
      align: 'left',
      baseline: 'middle',
      maxWidth: 463,
    });
    pdf.text(tipo, 429, 605, {
      align: 'left',
      baseline: 'middle',
      maxWidth: 479,
    });
    pdf.text(String(cantidadInicial), 570, 716, {
      align: 'left',
      baseline: 'middle',
      maxWidth: 338,
    });
    pdf.setFillColor(255, 255, 255);
    pdf.rect(317, 862, 468, 468, 'F');
    pdf.addImage(qrCodeBase64, 'PNG', 317, 862, 468, 468);
    return String(pdf.output('bloburl'));
  }

  const htmlContent = `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          @page { size: letter portrait; margin: 0; }
          html, body {
            width: 8.5in;
            height: 11in;
            margin: 0;
            padding: 0;
          }
          body {
            position: relative;
            overflow: hidden;
            font-family: Arial, sans-serif;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .pageBackground {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: fill;
            z-index: 0;
          }
          .value {
            position: absolute;
            height: 4%;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            box-sizing: border-box;
            overflow: hidden;
            color: #111;
            font-size: 15pt;
            font-weight: 700;
            line-height: 1.05;
            text-align: left;
            z-index: 1;
          }
          .business {
            position: absolute;
            left: 27%;
            top: 21.4%;
            width: 46%;
            height: 5.3%;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            color: #111;
            font-size: 20pt;
            font-weight: 700;
            line-height: 1;
            text-align: center;
            z-index: 1;
          }
          .name { left: 40.35%; top: 32.5%; width: 42%; }
          .type { left: 38.9%; top: 40.4%; width: 43.4%; }
          .trips { left: 51.68%; top: 48.2%; width: 30.6%; }
          .qrContainer {
            position: absolute;
            left: 28.7%;
            top: 60.45%;
            width: 42.45%;
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            padding: 0;
            background: #fff;
            z-index: 1;
          }
          .qrContainer img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
        </style>
      </head>
      <body>
        <img class="pageBackground" src="${backgroundDataUrl}" />
        <div class="business">${escapeHtml(businessName)}</div>
        <div class="value name">${escapeHtml(nombre)}</div>
        <div class="value type">${escapeHtml(tipo)}</div>
        <div class="value trips">${cantidadInicial}</div>
        <div class="qrContainer"><img src="${qrCodeBase64}" /></div>
      </body>
    </html>
  `;
  return (await Print.printToFileAsync({ html: htmlContent })).uri;
};

export const QRGenerator: React.FC<QRGeneratorProps> = ({ isVisible, onClose, ticketId, qrToken, nombre, tipo, cantidadInicial, projectId }) => {
  const qrValue = ticketQrValue(projectId, ticketId, qrToken);
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

      const uri = await createTicketPdf({
        nombre,
        tipo,
        cantidadInicial,
        qrCodeBase64,
      });

      if (Platform.OS === 'web') {
        const a = document.createElement('a');
        a.href = uri;
        a.download = `ticket_${ticketId}_${nombre.replace(/\s+/g, '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.setTimeout(() => window.URL.revokeObjectURL(uri), 1500);
      } else {
        // En móvil, usar shareAsync
        await shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }

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
              <Text style={styles.buttonText}>{Platform.OS === 'web' ? 'Descargar PDF' : 'Compartir PDF'}</Text>
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
