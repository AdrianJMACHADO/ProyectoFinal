import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { NavigationHeaderRegistration } from '@/components/NavigationHeaderRegistration';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useThemeColor';
import {
  FeriaRecord,
  TicketRecord,
  setFeriasListVisibility,
  setTicketsListVisibility,
  subscribeFerias,
  subscribeTickets,
} from '@/services/firestoreData';
import {
  getDefaultTemplateAsset,
  getPdfBusinessName,
  PdfTemplateConfig,
  subscribePdfTemplate,
  uploadPdfTemplate,
  useDefaultPdfTemplate,
} from '@/services/pdfTemplate';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import UsersScreen from './usuarios';

type VisibilitySection = 'inicio' | 'usuarios' | 'ferias' | 'tickets' | 'pdf';
type VisibilityItem = {
  id: number;
  nombre: string;
  detail: string;
  visible: boolean;
};

type AjustesScreenProps = {
  embedded?: boolean;
};

export default function AjustesScreen({ embedded = false }: AjustesScreenProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role } = useAuth();
  const [section, setSection] = useState<VisibilitySection>('inicio');
  const [ferias, setFerias] = useState<FeriaRecord[]>([]);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [pdfTemplate, setPdfTemplate] = useState<PdfTemplateConfig | null>(null);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [businessName, setBusinessName] = useState('Mi negocio');

  useEffect(() => {
    const unsubscribeFerias = subscribeFerias(data => {
      setFerias(data);
      setLoaded(true);
    });
    const unsubscribeTickets = subscribeTickets(data => setTickets(data));
    return () => {
      unsubscribeFerias();
      unsubscribeTickets();
    };
  }, []);

  useEffect(() => {
    if (role !== 'SUPERADMIN') return;
    getPdfBusinessName().then(setBusinessName).catch(() => undefined);
    return subscribePdfTemplate(setPdfTemplate, () => setPdfTemplate(null));
  }, [role]);

  useEffect(() => setSelected(new Set()), [section]);

  const inactiveFerias = useMemo(
    () => ferias.filter(item => (item.estado ?? 'ACTIVO') === 'INACTIVO'),
    [ferias],
  );
  const inactiveTickets = useMemo(
    () => tickets.filter(item => (item.estado ?? 'ACTIVO') === 'INACTIVO'),
    [tickets],
  );

  if (role === 'EMPLEADO') return <Redirect href="/empleado" />;

  const goBack = () => {
    if (section === 'inicio' && !embedded) router.back();
    else setSection('inicio');
  };

  const toggle = (id: number) => {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (items: VisibilityItem[]) => {
    const ids = items.map(item => item.id);
    setSelected(current =>
      current.size === ids.length ? new Set() : new Set(ids),
    );
  };

  const changeVisibility = async (visible: boolean) => {
    if (!selected.size) return;
    setSaving(true);
    try {
      const ids = [...selected];
      if (section === 'ferias') await setFeriasListVisibility(ids, visible);
      if (section === 'tickets') await setTicketsListVisibility(ids, visible);
      setSelected(new Set());
    } finally {
      setSaving(false);
    }
  };

  const shareTemplateGuide = async () => {
    try {
      const asset = await getDefaultTemplateAsset();
      const uri = asset.localUri ?? asset.uri;
      if (Platform.OS === 'web') {
        const anchor = document.createElement('a');
        anchor.href = uri;
        anchor.download = 'plantilla-LaUveTickets-1103x1426.png';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        return;
      }
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('No disponible', 'Este dispositivo no permite compartir archivos.');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Guardar plantilla de LaUveTickets',
      });
    } catch {
      Alert.alert('No se pudo descargar', 'Vuelve a intentarlo en unos segundos.');
    }
  };

  const choosePdfTemplate = async () => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(
            'Permiso necesario',
            'Permite acceder a tus fotos para seleccionar el diseño del ticket.',
          );
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const expectedRatio = 1103 / 1426;
      const ratio = asset.width / asset.height;
      if (
        asset.width < 1000 ||
        asset.height < 1290 ||
        Math.abs(ratio - expectedRatio) > expectedRatio * 0.025
      ) {
        Alert.alert(
          'Medidas no compatibles',
          'Usa una imagen vertical con proporción 1103 × 1426 px. Descarga la guía y diseña encima sin recortarla.',
        );
        return;
      }
      if ((asset.fileSize ?? 0) > 10 * 1024 * 1024) {
        Alert.alert('Archivo demasiado grande', 'La imagen debe pesar menos de 10 MB.');
        return;
      }
      setTemplateSaving(true);
      await uploadPdfTemplate({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        contentType: asset.mimeType ?? 'image/png',
      });
      Alert.alert('Plantilla activada', 'Los próximos PDF usarán este diseño.');
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      Alert.alert(
        'No se pudo guardar',
        message.includes('permission')
          ? 'Actualiza las reglas de Firestore para permitir guardar plantillas.'
          : message || 'Comprueba tu conexión y vuelve a intentarlo.',
      );
    } finally {
      setTemplateSaving(false);
    }
  };

  const restoreDefaultTemplate = async () => {
    setTemplateSaving(true);
    try {
      await useDefaultPdfTemplate();
      Alert.alert('Plantilla restaurada', 'Los PDF volverán a usar el diseño original.');
    } catch {
      Alert.alert('No se pudo restaurar', 'Comprueba las reglas de Firebase.');
    } finally {
      setTemplateSaving(false);
    }
  };

  const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    header: {
      minHeight: 62,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
      backgroundColor: theme.card,
    },
    back: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: { flex: 1, textAlign: 'center' },
    headerSpacer: { width: 42 },
    content: {
      padding: 18,
      paddingBottom: Math.max(insets.bottom, 8) + 118,
      gap: 14,
    },
    intro: { opacity: 0.7, lineHeight: 21, marginBottom: 5 },
    restricted: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      gap: 13,
    },
    card: {
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 10,
    },
    cardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardCopy: { flex: 1, gap: 3 },
    description: { opacity: 0.68, lineHeight: 19 },
    badge: {
      alignSelf: 'flex-start',
      borderRadius: 10,
      paddingHorizontal: 9,
      paddingVertical: 4,
      marginTop: 4,
    },
    listHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingTop: 16,
      paddingBottom: 10,
    },
    selectAll: { color: theme.buttonPrimary, fontWeight: '700' },
    row: {
      marginHorizontal: 18,
      marginBottom: 10,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    checkbox: {
      width: 25,
      height: 25,
      borderRadius: 8,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1 },
    muted: { opacity: 0.62, marginTop: 3 },
    visibility: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 10,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 18,
      paddingTop: 10,
      paddingBottom:
        Math.max(insets.bottom, 12) + (embedded ? 86 : 0),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.border,
      backgroundColor: theme.background,
    },
    action: {
      flex: 1,
      minHeight: 48,
      borderRadius: 13,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    empty: { alignItems: 'center', padding: 45, gap: 12 },
    templateContent: {
      padding: 18,
      paddingBottom: Math.max(insets.bottom, 8) + 118,
      gap: 16,
    },
    preview: {
      width: '100%',
      maxWidth: 430,
      alignSelf: 'center',
      aspectRatio: 1103 / 1426,
      borderRadius: 18,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: '#fff',
    },
    previewImage: { width: '100%', height: '100%' },
    sampleValue: {
      position: 'absolute',
      height: '4%',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    sampleText: { color: '#111', fontWeight: '800', fontSize: 10 },
    sampleBusiness: {
      position: 'absolute',
      left: '27%',
      top: '21.4%',
      width: '46%',
      height: '5.3%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sampleQr: {
      position: 'absolute',
      left: '28.7%',
      top: '60.45%',
      width: '42.45%',
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#fff',
    },
    templateButton: {
      minHeight: 52,
      borderRadius: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
    },
    templateHint: {
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 15,
      gap: 7,
    },
  });

  const renderHome = () => (
    <ScrollView contentContainerStyle={styles.content}>
      <ThemedText type="title">Ajustes del negocio</ThemedText>
      <ThemedText style={styles.intro}>
        Herramientas avanzadas del superadministrador. Ocultar un elemento no
        lo borra ni modifica sus estadísticas.
      </ThemedText>

      <Pressable onPress={() => setSection('usuarios')}>
        <ThemedView type="card" style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.iconBox, { backgroundColor: `${theme.buttonPrimary}22` }]}>
              <Ionicons name="people-outline" size={25} color={theme.buttonPrimary} />
            </View>
            <View style={styles.cardCopy}>
              <ThemedText type="subtitle">Usuarios y permisos</ThemedText>
              <ThemedText style={styles.description}>
                Crea cuentas, asigna administradores y activa o desactiva empleados.
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.placeholder} />
          </View>
        </ThemedView>
      </Pressable>

      <Pressable onPress={() => setSection('ferias')}>
        <ThemedView type="card" style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.iconBox, { backgroundColor: `${theme.buttonPrimary}22` }]}>
              <Ionicons name="calendar-outline" size={25} color={theme.buttonPrimary} />
            </View>
            <View style={styles.cardCopy}>
              <ThemedText type="subtitle">Ferias inactivas</ThemedText>
              <ThemedText style={styles.description}>
                Elige cuáles seguir mostrando y oculta en bloque las que ya no
                necesitas consultar.
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.placeholder} />
          </View>
          <ThemedText style={{ color: theme.buttonPrimary }}>
            {inactiveFerias.length} disponibles para revisar
          </ThemedText>
        </ThemedView>
      </Pressable>

      <Pressable onPress={() => setSection('tickets')}>
        <ThemedView type="card" style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.iconBox, { backgroundColor: `${theme.success}22` }]}>
              <Ionicons name="ticket-outline" size={25} color={theme.success} />
            </View>
            <View style={styles.cardCopy}>
              <ThemedText type="subtitle">Tickets inactivos</ThemedText>
              <ThemedText style={styles.description}>
                Limpia los listados sin perder usos, trazabilidad ni históricos.
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={22} color={theme.placeholder} />
          </View>
          <ThemedText style={{ color: theme.success }}>
            {inactiveTickets.length} disponibles para revisar
          </ThemedText>
        </ThemedView>
      </Pressable>

      <Pressable onPress={() => setSection('pdf')}>
        <ThemedView type="card" style={styles.card}>
          <View style={styles.cardTop}>
            <View style={[styles.iconBox, { backgroundColor: '#9C6CFF22' }]}>
              <Ionicons name="image-outline" size={25} color="#A985FF" />
            </View>
            <View style={styles.cardCopy}>
              <ThemedText type="subtitle">Plantillas de tickets PDF</ThemedText>
              <ThemedText style={styles.description}>
                Personaliza el fondo y la posición del QR y de los datos.
              </ThemedText>
              <View style={[styles.badge, { backgroundColor: '#9C6CFF22' }]}>
                <ThemedText style={{ color: '#B79AFF', fontWeight: '700', fontSize: 12 }}>
                  PERSONALIZABLE
                </ThemedText>
              </View>
            </View>
          </View>
        </ThemedView>
      </Pressable>
    </ScrollView>
  );

  const items: VisibilityItem[] =
    section === 'ferias'
      ? inactiveFerias.map(item => ({
          id: item.idFeria,
          nombre: item.nombre,
          detail: item.fecha,
          visible: item.visible_en_listado !== false,
        }))
      : inactiveTickets.map(item => ({
          id: item.idTicket,
          nombre: item.nombre,
          detail: `Ticket ${item.idTicket} · ${item.tipo}`,
          visible: item.visible_en_listado !== false,
        }));
  const sectionTitle = section === 'ferias' ? 'Ferias inactivas' : 'Tickets inactivos';

  const renderVisibility = () => (
    <>
      <View style={styles.listHeader}>
        <ThemedText>
          {selected.size ? `${selected.size} seleccionados` : `${items.length} elementos`}
        </ThemedText>
        {!!items.length && (
          <TouchableOpacity onPress={() => selectAll(items)}>
            <ThemedText style={styles.selectAll}>
              {selected.size === items.length ? 'Quitar selección' : 'Seleccionar todo'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>
      {!loaded ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.buttonPrimary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={54} color={theme.success} />
              <ThemedText type="subtitle">No hay elementos inactivos</ThemedText>
            </View>
          }
          renderItem={({ item }) => {
            return (
              <Pressable
                onPress={() => toggle(item.id)}
                style={[
                  styles.row,
                  selected.has(item.id) && {
                    borderColor: theme.buttonPrimary,
                    backgroundColor: `${theme.buttonPrimary}0D`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: selected.has(item.id) ? theme.buttonPrimary : theme.border,
                      backgroundColor: selected.has(item.id) ? theme.buttonPrimary : 'transparent',
                    },
                  ]}
                >
                  {selected.has(item.id) && <Ionicons name="checkmark" size={17} color="white" />}
                </View>
                <View style={styles.rowText}>
                  <ThemedText type="subtitle">{item.nombre}</ThemedText>
                  <ThemedText style={styles.muted}>{item.detail}</ThemedText>
                </View>
                <View
                  style={[
                    styles.visibility,
                    { backgroundColor: item.visible ? `${theme.success}20` : `${theme.error}20` },
                  ]}
                >
                  <Ionicons
                    name={item.visible ? 'eye-outline' : 'eye-off-outline'}
                    size={19}
                    color={item.visible ? theme.success : theme.error}
                  />
                </View>
              </Pressable>
            );
          }}
        />
      )}
      <View style={styles.actions}>
        <TouchableOpacity
          disabled={!selected.size || saving}
          onPress={() => changeVisibility(false)}
          style={[
            styles.action,
            {
              backgroundColor: `${theme.error}20`,
              opacity: selected.size ? 1 : 0.45,
            },
          ]}
        >
          <Ionicons name="eye-off-outline" size={21} color={theme.error} />
          <ThemedText style={{ color: theme.error, fontWeight: '800' }}>Ocultar</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!selected.size || saving}
          onPress={() => changeVisibility(true)}
          style={[
            styles.action,
            {
              backgroundColor: theme.buttonPrimary,
              opacity: selected.size ? 1 : 0.45,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="eye-outline" size={21} color="white" />
              <ThemedText style={{ color: 'white', fontWeight: '800' }}>Mostrar</ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
  );

  const renderPdfTemplates = () => {
    const customTemplateActive =
      pdfTemplate?.active && typeof pdfTemplate.dataUrl === 'string';
    return (
      <ScrollView contentContainerStyle={styles.templateContent}>
        <View>
          <ThemedText type="title">Diseña tu ticket</ThemedText>
          <ThemedText style={styles.intro}>
            Descarga la guía, crea tu diseño sin mover ni recortar sus zonas y
            vuelve a subirlo. El nombre, el tipo, el número de viajes y el QR se
            colocan automáticamente.
          </ThemedText>
        </View>

        <View style={styles.preview}>
          <Image
            source={
              customTemplateActive
                ? { uri: pdfTemplate.dataUrl }
                : require('../assets/images/Plantilla.png')
            }
            resizeMode="stretch"
            style={styles.previewImage}
          />
          <View style={styles.sampleBusiness}>
            <ThemedText numberOfLines={1} style={styles.sampleText}>
              {businessName}
            </ThemedText>
          </View>
          <View style={[styles.sampleValue, { left: '40.35%', top: '32.5%', width: '42%' }]}>
            <ThemedText numberOfLines={1} style={styles.sampleText}>Ticket de muestra</ThemedText>
          </View>
          <View style={[styles.sampleValue, { left: '38.9%', top: '40.4%', width: '43.4%' }]}>
            <ThemedText numberOfLines={1} style={styles.sampleText}>Invitación</ThemedText>
          </View>
          <View style={[styles.sampleValue, { left: '51.68%', top: '48.2%', width: '30.6%' }]}>
            <ThemedText numberOfLines={1} style={styles.sampleText}>5</ThemedText>
          </View>
          <View style={styles.sampleQr}>
            <Ionicons name="qr-code-outline" size={72} color="#111" />
          </View>
        </View>

        <View style={styles.templateHint}>
          <ThemedText style={{ fontWeight: '800' }}>
            Formato obligatorio: 1103 × 1426 px
          </ThemedText>
          <ThemedText style={styles.description}>
            PNG o JPG vertical, hasta 10 MB. No cambies el tamaño del lienzo ni
            tapes la zona blanca reservada para el QR.
          </ThemedText>
          <ThemedText style={{ color: customTemplateActive ? theme.success : theme.buttonPrimary }}>
            {customTemplateActive
              ? 'Plantilla personalizada activa'
              : 'Plantilla original activa'}
          </ThemedText>
        </View>

        <TouchableOpacity
          style={[styles.templateButton, { borderWidth: 1, borderColor: theme.buttonPrimary }]}
          onPress={shareTemplateGuide}
          disabled={templateSaving}
        >
          <Ionicons name="download-outline" size={22} color={theme.buttonPrimary} />
          <ThemedText style={{ color: theme.buttonPrimary, fontWeight: '800' }}>
            Descargar guía
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.templateButton, { backgroundColor: '#8B5CF6' }]}
          onPress={choosePdfTemplate}
          disabled={templateSaving}
        >
          {templateSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={22} color="white" />
              <ThemedText style={{ color: 'white', fontWeight: '800' }}>
                Subir y activar diseño
              </ThemedText>
            </>
          )}
        </TouchableOpacity>

        {customTemplateActive && (
          <TouchableOpacity
            style={[styles.templateButton, { borderWidth: 1, borderColor: theme.error }]}
            onPress={restoreDefaultTemplate}
            disabled={templateSaving}
          >
            <Ionicons name="refresh-outline" size={22} color={theme.error} />
            <ThemedText style={{ color: theme.error, fontWeight: '800' }}>
              Restaurar plantilla original
            </ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.screen, { paddingTop: Math.max(0, insets.top - 8) }]}>
      {embedded && <NavigationHeaderRegistration tab="Ajustes" />}
      {(!embedded || section !== 'inicio') && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.back} onPress={goBack}>
            <Ionicons name="chevron-back" size={28} color={theme.buttonPrimary} />
          </TouchableOpacity>
          <ThemedText type="subtitle" style={styles.headerText}>
            {section === 'inicio'
              ? 'Configuración'
              : section === 'usuarios'
                ? 'Usuarios y permisos'
                : section === 'pdf'
                  ? 'Plantillas PDF'
                  : sectionTitle}
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>
      )}
      {role !== 'SUPERADMIN' ? (
        <View style={styles.restricted}>
          <Ionicons name="lock-closed-outline" size={62} color={theme.placeholder} />
          <ThemedText type="title" style={{ textAlign: 'center' }}>
            Ajustes reservados
          </ThemedText>
          <ThemedText style={{ textAlign: 'center', opacity: 0.68, lineHeight: 21 }}>
            Por ahora, solo el superadministrador puede gestionar usuarios,
            históricos y configuración del negocio.
          </ThemedText>
        </View>
      ) : section === 'usuarios' ? (
        <UsersScreen embedded />
      ) : section === 'inicio' || section === 'pdf'
        ? section === 'inicio'
          ? renderHome()
          : renderPdfTemplates()
        : renderVisibility()}
    </SafeAreaView>
  );
}
