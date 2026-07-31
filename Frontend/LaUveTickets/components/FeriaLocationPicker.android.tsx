import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type {
  FeriaLocationPickerProps,
  FeriaLocationValue,
} from './FeriaLocationPicker.types';

export type { FeriaLocationValue };

type Coordinates = {
  latitude: number;
  longitude: number;
};

type MapMessage = {
  type?: 'ready' | 'center-changed' | 'map-error' | 'fatal-error';
  latitude?: number;
  longitude?: number;
  detail?: string;
};

const SPAIN_CENTER: Coordinates = {
  latitude: 40.4168,
  longitude: -3.7038,
};

const isValidCoordinate = ({ latitude, longitude }: Coordinates) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

const normalizeValue = (
  value?: FeriaLocationValue,
): FeriaLocationValue | undefined => {
  if (!value) return undefined;

  const normalized = {
    ...value,
    latitud: Number(value.latitud),
    longitud: Number(value.longitud),
  };

  return isValidCoordinate({
    latitude: normalized.latitud,
    longitude: normalized.longitud,
  })
    ? normalized
    : undefined;
};

const escapeHtmlJson = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

const buildMapHtml = (initialValue?: FeriaLocationValue) => {
  const initial = initialValue
    ? {
        latitude: initialValue.latitud,
        longitude: initialValue.longitud,
        zoom: 13,
      }
    : {
        ...SPAIN_CENTER,
        zoom: 5,
      };

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
  />
  <link
    rel="stylesheet"
    href="https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.css"
  />
  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #202024;
      touch-action: none;
    }

    .maplibregl-canvas {
      outline: none;
    }

    .maplibregl-ctrl-attrib {
      font-size: 9px;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.js"></script>
  <script>
    (() => {
      const initial = ${escapeHtmlJson(initial)};

      const send = payload => {
        window.ReactNativeWebView?.postMessage(JSON.stringify(payload));
      };

      try {
        if (!window.maplibregl) {
          throw new Error('No se pudo cargar MapLibre.');
        }

        const map = new maplibregl.Map({
          container: 'map',
          style: 'https://tiles.openfreemap.org/styles/liberty',
          center: [initial.longitude, initial.latitude],
          zoom: initial.zoom,
          attributionControl: true,
          dragPan: true,
          scrollZoom: true,
          touchZoomRotate: true,
          doubleClickZoom: true,
          keyboard: false,
        });

        map.touchZoomRotate.disableRotation();

        map.addControl(
          new maplibregl.NavigationControl({
            showCompass: false,
            visualizePitch: false,
          }),
          'bottom-right'
        );

        const reportCenter = () => {
          const center = map.getCenter();

          send({
            type: 'center-changed',
            latitude: center.lat,
            longitude: center.lng,
          });
        };

        window.moveFeriaMap = (latitude, longitude, zoom = 14) => {
          const lat = Number(latitude);
          const lng = Number(longitude);

          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            lat < -90 ||
            lat > 90 ||
            lng < -180 ||
            lng > 180
          ) {
            return;
          }

          map.easeTo({
            center: [lng, lat],
            zoom: Number(zoom),
            duration: 450,
          });
        };

        map.on('load', () => {
          map.resize();
          reportCenter();
          send({ type: 'ready' });
        });

        map.on('moveend', reportCenter);

        map.on('error', event => {
          send({
            type: 'map-error',
            detail:
              event?.error?.message ||
              'No se pudo cargar alguna parte del mapa.',
          });
        });

        window.addEventListener('resize', () => map.resize());
      } catch (error) {
        send({
          type: 'fatal-error',
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  </script>
</body>
</html>`;
};

const ensureLocationPermission = async (): Promise<boolean> => {
  const current = await Location.getForegroundPermissionsAsync();

  if (current.status === 'granted') {
    return true;
  }

  const requested = await Location.requestForegroundPermissionsAsync();

  if (requested.status === 'granted') {
    return true;
  }

  Alert.alert(
    'Permiso de ubicación necesario',
    'Android necesita este permiso para buscar nombres de lugares y obtener direcciones. Puedes activarlo desde los ajustes de la aplicación.',
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Abrir ajustes',
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ],
  );

  return false;
};

const describeLocation = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  try {
    const hasPermission = await ensureLocationPermission();
    if (!hasPermission) return '';

    const [address] = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    return [
      address?.name,
      address?.city,
      address?.subregion,
      address?.region,
    ]
      .filter(Boolean)
      .filter((part, index, list) => list.indexOf(part) === index)
      .slice(0, 3)
      .join(', ');
  } catch {
    return '';
  }
};

export default function FeriaLocationPicker({
  value,
  onChange,
  initialSearch = '',
}: FeriaLocationPickerProps) {
  const webViewRef = useRef<WebView>(null);
  const initialValue = useMemo(() => normalizeValue(value), []);
  const html = useMemo(() => buildMapHtml(initialValue), []);

  const [query, setQuery] = useState(initialSearch);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [draftCoordinates, setDraftCoordinates] = useState<Coordinates>(
    initialValue
      ? {
          latitude: initialValue.latitud,
          longitude: initialValue.longitud,
        }
      : SPAIN_CENTER,
  );

  const moveMapTo = (
    latitude: number,
    longitude: number,
    zoom = 14,
  ) => {
    webViewRef.current?.injectJavaScript(`
      window.moveFeriaMap?.(
        ${JSON.stringify(latitude)},
        ${JSON.stringify(longitude)},
        ${JSON.stringify(zoom)}
      );
      true;
    `);
  };

  const commitCoordinates = async (
    coordinates: Coordinates,
    origin: FeriaLocationValue['ubicacionOrigen'],
  ) => {
    if (!isValidCoordinate(coordinates)) {
      Alert.alert(
        'Coordenadas no válidas',
        'No se puede utilizar esa ubicación.',
      );
      return;
    }

    setConfirming(true);

    try {
      const ubicacionNombre = await describeLocation(
        coordinates.latitude,
        coordinates.longitude,
      );

      onChange({
        latitud: coordinates.latitude,
        longitud: coordinates.longitude,
        ubicacionNombre:
          ubicacionNombre ||
          `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`,
        ubicacionOrigen: origin,
      });
    } finally {
      setConfirming(false);
    }
  };

  const searchByName = async () => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || searching) return;

    setSearching(true);

    try {
      const hasPermission = await ensureLocationPermission();
      if (!hasPermission) return;

      const results = await Location.geocodeAsync(
        `${trimmedQuery}, España`,
      );
      const match = results[0];

      if (!match) {
        Alert.alert(
          'No encontramos esa ubicación',
          'Prueba con un nombre más concreto, por ejemplo: "Recinto Ferial de Sevilla" o "Dos Hermanas, Sevilla".',
        );
        return;
      }

      const coordinates = {
        latitude: match.latitude,
        longitude: match.longitude,
      };

      setDraftCoordinates(coordinates);
      moveMapTo(coordinates.latitude, coordinates.longitude, 15);

      // Una búsqueda explícita ya representa una selección.
      await commitCoordinates(coordinates, 'MAPA');
    } catch (error) {
      Alert.alert(
        'No se pudo buscar',
        (error as Error).message ||
          'No se ha podido encontrar esa ubicación.',
      );
    } finally {
      setSearching(false);
    }
  };

  const useDeviceLocation = async () => {
    if (locating) return;

    setLocating(true);

    try {
      const hasPermission = await ensureLocationPermission();
      if (!hasPermission) return;

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coordinates = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      setDraftCoordinates(coordinates);
      moveMapTo(coordinates.latitude, coordinates.longitude, 16);
      await commitCoordinates(coordinates, 'DISPOSITIVO');
    } catch (error) {
      Alert.alert(
        'No se pudo obtener la ubicación',
        (error as Error).message,
      );
    } finally {
      setLocating(false);
    }
  };

  const handleMapMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(
        event.nativeEvent.data,
      ) as MapMessage;

      if (message.type === 'ready') {
        setMapLoading(false);
        setMapError(null);
        return;
      }

      if (
        message.type === 'center-changed' &&
        typeof message.latitude === 'number' &&
        typeof message.longitude === 'number'
      ) {
        setDraftCoordinates({
          latitude: message.latitude,
          longitude: message.longitude,
        });
        return;
      }

      if (
        message.type === 'map-error' ||
        message.type === 'fatal-error'
      ) {
        setMapLoading(false);
        setMapError(
          message.detail || 'No se ha podido cargar el mapa.',
        );
      }
    } catch {
      setMapLoading(false);
      setMapError('El mapa devolvió una respuesta no válida.');
    }
  };

  const displayedValue = normalizeValue(value);

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => {
            void searchByName();
          }}
          placeholder="Ej.: Recinto Ferial de Sevilla"
          placeholderTextColor="#86868C"
          returnKeyType="search"
          autoCorrect={false}
          style={styles.searchInput}
        />

        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => {
            void searchByName();
          }}
          disabled={searching}
        >
          {searching ? (
            <ActivityIndicator color="white" />
          ) : (
            <Ionicons name="search" size={21} color="white" />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.locationButton}
        onPress={() => {
          void useDeviceLocation();
        }}
        disabled={locating}
      >
        {locating ? (
          <ActivityIndicator color="white" />
        ) : (
          <Ionicons name="locate" size={20} color="white" />
        )}

        <Text style={styles.buttonText}>
          {locating
            ? 'Buscando ubicación…'
            : 'Usar mi ubicación actual'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.help}>
        Arrastra el mapa hasta dejar la mira sobre la ubicación exacta y pulsa
        «Usar este punto».
      </Text>

      <View style={styles.mapFrame}>
        <WebView
          ref={webViewRef}
          source={{
            html,
            baseUrl: 'https://openfreemap.org',
          }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures={false}
          scrollEnabled={false}
          nestedScrollEnabled
          overScrollMode="never"
          mixedContentMode="never"
          onMessage={handleMapMessage}
          onLoadStart={() => {
            setMapLoading(true);
            setMapError(null);
          }}
          onError={event => {
            setMapLoading(false);
            setMapError(
              event.nativeEvent.description ||
                'No se ha podido abrir el mapa.',
            );
          }}
          onHttpError={event => {
            setMapLoading(false);
            setMapError(
              `El mapa respondió con HTTP ${event.nativeEvent.statusCode}.`,
            );
          }}
          style={styles.map}
        />

        <View pointerEvents="none" style={styles.crosshairContainer}>
          <View style={styles.crosshairCircle}>
            <Ionicons name="location" size={34} color="#168BFF" />
          </View>
          <View style={styles.crosshairShadow} />
        </View>

        {mapLoading && (
          <View pointerEvents="none" style={styles.mapOverlay}>
            <ActivityIndicator size="large" color="#168BFF" />
            <Text style={styles.overlayText}>Cargando mapa…</Text>
          </View>
        )}

        {mapError && (
          <View pointerEvents="none" style={styles.mapOverlay}>
            <Ionicons
              name="cloud-offline-outline"
              size={34}
              color="#FF6B6B"
            />
            <Text style={styles.errorText}>{mapError}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={styles.confirmButton}
        onPress={() => {
          void commitCoordinates(draftCoordinates, 'MAPA');
        }}
        disabled={confirming || mapLoading || Boolean(mapError)}
      >
        {confirming ? (
          <ActivityIndicator color="white" />
        ) : (
          <Ionicons name="checkmark-circle" size={21} color="white" />
        )}
        <Text style={styles.buttonText}>
          {confirming ? 'Guardando punto…' : 'Usar este punto'}
        </Text>
      </TouchableOpacity>

      {displayedValue && (
        <View style={styles.selection}>
          <Ionicons name="location" size={18} color="#168BFF" />
          <Text style={styles.selectionText}>
            {displayedValue.ubicacionNombre ||
              `${displayedValue.latitud.toFixed(5)}, ${displayedValue.longitud.toFixed(5)}`}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: 'white',
    backgroundColor: '#2A2A2E',
    borderWidth: 1,
    borderColor: '#4A4A50',
  },
  searchButton: {
    width: 50,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#168BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#168BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  confirmButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#30A46C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  help: {
    color: '#9B9BA1',
    fontSize: 12,
    lineHeight: 17,
  },
  mapFrame: {
    position: 'relative',
    width: '100%',
    height: 390,
    overflow: 'hidden',
    borderRadius: 14,
    backgroundColor: '#202024',
  },
  map: {
    flex: 1,
    backgroundColor: '#202024',
  },
  crosshairContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairCircle: {
    marginTop: -30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crosshairShadow: {
    width: 18,
    height: 6,
    marginTop: -5,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.32)',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
    backgroundColor: 'rgba(32, 32, 36, 0.94)',
  },
  overlayText: {
    color: '#D8D8DC',
  },
  errorText: {
    color: '#FFB4B4',
    textAlign: 'center',
  },
  selection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  selectionText: {
    flex: 1,
    color: '#D8D8DC',
    fontSize: 13,
  },
});
