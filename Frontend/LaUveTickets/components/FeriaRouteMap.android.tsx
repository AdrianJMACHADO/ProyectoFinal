import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { FeriaWithLocation } from '../services/feriaTravel';

type Props = {
  ferias: FeriaWithLocation[];
};

type MapPoint = {
  id: string;
  name: string;
  locationName: string;
  latitude: number;
  longitude: number;
};

type MapStatus = 'loading' | 'ready' | 'error';

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const isValidCoordinate = (latitude: number, longitude: number): boolean =>
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

const escapeHtmlJson = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

const buildMapHtml = (points: MapPoint[]): string => {
  const payload = escapeHtmlJson(points);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.css" />
  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #202024;
    }
    .maplibregl-popup-content {
      max-width: 240px;
      color: #17171a;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      border-radius: 10px;
      padding: 10px 12px;
    }
    .maplibregl-ctrl-attrib { font-size: 10px; }
    .route-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: 2px solid white;
      border-radius: 50%;
      background: #168BFF;
      color: white;
      font: 700 13px system-ui, sans-serif;
      box-shadow: 0 2px 7px rgba(0, 0, 0, 0.32);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/maplibre-gl@5.6.2/dist/maplibre-gl.js"></script>
  <script>
    (() => {
      const points = ${payload};

      const send = (type, detail) => {
        window.ReactNativeWebView?.postMessage(
          JSON.stringify({ type, detail: detail || null })
        );
      };

      try {
        if (!window.maplibregl) {
          throw new Error('No se pudo cargar MapLibre GL.');
        }

        if (!Array.isArray(points) || points.length === 0) {
          throw new Error('No hay coordenadas válidas.');
        }

        const first = points[0];
        const map = new maplibregl.Map({
          container: 'map',
          style: 'https://tiles.openfreemap.org/styles/liberty',
          center: [first.longitude, first.latitude],
          zoom: points.length === 1 ? 12 : 5,
          attributionControl: true,
        });

        map.addControl(
          new maplibregl.NavigationControl({
            showCompass: false,
            visualizePitch: false,
          }),
          'bottom-right'
        );

        map.on('load', () => {
          const routeCoordinates = points.map(point => [
            point.longitude,
            point.latitude,
          ]);

          if (routeCoordinates.length > 1) {
            map.addSource('feria-route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: routeCoordinates,
                },
              },
            });

            map.addLayer({
              id: 'feria-route-line',
              type: 'line',
              source: 'feria-route',
              layout: {
                'line-cap': 'round',
                'line-join': 'round',
              },
              paint: {
                'line-color': '#168BFF',
                'line-width': 4,
              },
            });
          }

          points.forEach((point, index) => {
            const markerElement = document.createElement('div');
            markerElement.className = 'route-marker';
            markerElement.textContent = String(index + 1);

            const popupRoot = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = (index + 1) + '. ' + point.name;
            popupRoot.appendChild(title);

            if (point.locationName) {
              const location = document.createElement('div');
              location.style.marginTop = '4px';
              location.textContent = point.locationName;
              popupRoot.appendChild(location);
            }

            new maplibregl.Marker({
              element: markerElement,
              anchor: 'center',
            })
              .setLngLat([point.longitude, point.latitude])
              .setPopup(
                new maplibregl.Popup({ offset: 20, closeButton: true })
                  .setDOMContent(popupRoot)
              )
              .addTo(map);
          });

          if (points.length > 1) {
            const bounds = new maplibregl.LngLatBounds();
            points.forEach(point => {
              bounds.extend([point.longitude, point.latitude]);
            });
            map.fitBounds(bounds, {
              padding: 46,
              maxZoom: 12,
              duration: 0,
            });
          }

          map.resize();
          send('ready');
        });

        map.on('error', event => {
          const message = event?.error?.message || 'No se pudo cargar alguna parte del mapa.';
          send('map-error', message);
        });

        window.addEventListener('resize', () => map.resize());
      } catch (error) {
        send('fatal-error', error instanceof Error ? error.message : String(error));
      }
    })();
  </script>
</body>
</html>`;
};

export default function FeriaRouteMap({ ferias }: Props) {
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<MapStatus>('loading');
  const [fullScreenStatus, setFullScreenStatus] =
    useState<MapStatus>('loading');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [fullScreenError, setFullScreenError] = useState<string | null>(null);

  const points = useMemo<MapPoint[]>(() => {
    const uniqueCoordinates = new Set<string>();

    return ferias.reduce<MapPoint[]>((result, feria, index) => {
      const latitude = toFiniteNumber(feria.latitud);
      const longitude = toFiniteNumber(feria.longitud);

      if (
        latitude === null ||
        longitude === null ||
        !isValidCoordinate(latitude, longitude)
      ) {
        return result;
      }

      const coordinateKey = `${latitude.toFixed(7)},${longitude.toFixed(7)}`;
      if (uniqueCoordinates.has(coordinateKey)) return result;
      uniqueCoordinates.add(coordinateKey);

      result.push({
        id: String(feria.idFeria ?? index),
        name: String(feria.nombre ?? 'Feria'),
        locationName: feria.ubicacionNombre
          ? String(feria.ubicacionNombre)
          : '',
        latitude,
        longitude,
      });

      return result;
    }, []);
  }, [ferias]);

  const html = useMemo(() => buildMapHtml(points), [points]);

  const handleMessage = (
    event: WebViewMessageEvent,
    target: 'preview' | 'fullscreen',
  ) => {
    const setStatus =
      target === 'preview' ? setPreviewStatus : setFullScreenStatus;
    const setError =
      target === 'preview' ? setPreviewError : setFullScreenError;

    try {
      const message = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        detail?: string | null;
      };

      if (message.type === 'ready') {
        setStatus('ready');
        setError(null);
        return;
      }

      if (
        message.type === 'fatal-error' ||
        message.type === 'map-error'
      ) {
        setStatus('error');
        setError(
          message.detail || 'No se ha podido cargar el mapa.',
        );
      }
    } catch {
      setStatus('error');
      setError('El mapa devolvió una respuesta no válida.');
    }
  };

  if (!points.length) {
    return (
      <View style={[styles.frame, styles.center]}>
        <Text style={styles.message}>
          No hay coordenadas válidas para mostrar el mapa.
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.frame}>
        <WebView
          key={`preview-${html}`}
          source={{ html, baseUrl: 'https://openfreemap.org' }}
          originWhitelist={['https://*']}
          javaScriptEnabled
          domStorageEnabled
          cacheEnabled
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures={false}
          scrollEnabled={false}
          nestedScrollEnabled={false}
          overScrollMode="never"
          androidLayerType="hardware"
          onMessage={event => handleMessage(event, 'preview')}
          onLoadStart={() => {
            setPreviewStatus('loading');
            setPreviewError(null);
          }}
          onError={event => {
            setPreviewStatus('error');
            setPreviewError(
              event.nativeEvent.description ||
                'No se ha podido abrir el mapa.',
            );
          }}
          onHttpError={event => {
            setPreviewStatus('error');
            setPreviewError(
              `El mapa respondió con HTTP ${event.nativeEvent.statusCode}.`,
            );
          }}
          pointerEvents="none"
          style={styles.webView}
        />

        {previewStatus === 'loading' && (
          <View pointerEvents="none" style={styles.statusOverlay}>
            <ActivityIndicator size="large" color="#168BFF" />
            <Text style={styles.statusText}>Cargando mapa…</Text>
          </View>
        )}

        {previewStatus === 'error' && (
          <View pointerEvents="none" style={styles.statusOverlay}>
            <Text style={styles.errorText}>
              {previewError || 'No se ha podido cargar el mapa.'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          accessibilityRole="button"
          style={styles.openButton}
          onPress={() => setFullScreenVisible(true)}
        >
          <Text style={styles.openButtonText}>Abrir mapa</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={fullScreenVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setFullScreenVisible(false)}
      >
        <SafeAreaView style={styles.fullScreen}>
          <View style={styles.fullScreenHeader}>
            <View style={styles.fullScreenHeaderText}>
              <Text style={styles.fullScreenTitle}>
                Recorrido de ferias
              </Text>
              <Text style={styles.fullScreenSubtitle}>
                Arrastra con un dedo y amplía con dos
              </Text>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              style={styles.closeButton}
              onPress={() => setFullScreenVisible(false)}
            >
              <Text style={styles.closeButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.fullScreenMapFrame}>
            <WebView
              key={`fullscreen-${html}-${String(fullScreenVisible)}`}
              source={{ html, baseUrl: 'https://openfreemap.org' }}
              originWhitelist={['https://*']}
              javaScriptEnabled
              domStorageEnabled
              cacheEnabled
              setSupportMultipleWindows={false}
              allowsBackForwardNavigationGestures={false}
              scrollEnabled={false}
              nestedScrollEnabled
              overScrollMode="never"
              androidLayerType="hardware"
              onMessage={event =>
                handleMessage(event, 'fullscreen')
              }
              onLoadStart={() => {
                setFullScreenStatus('loading');
                setFullScreenError(null);
              }}
              onError={event => {
                setFullScreenStatus('error');
                setFullScreenError(
                  event.nativeEvent.description ||
                    'No se ha podido abrir el mapa.',
                );
              }}
              onHttpError={event => {
                setFullScreenStatus('error');
                setFullScreenError(
                  `El mapa respondió con HTTP ${event.nativeEvent.statusCode}.`,
                );
              }}
              style={styles.fullScreenWebView}
            />

            {fullScreenStatus === 'loading' && (
              <View pointerEvents="none" style={styles.statusOverlay}>
                <ActivityIndicator size="large" color="#168BFF" />
                <Text style={styles.statusText}>Cargando mapa…</Text>
              </View>
            )}

            {fullScreenStatus === 'error' && (
              <View pointerEvents="none" style={styles.statusOverlay}>
                <Text style={styles.errorText}>
                  {fullScreenError ||
                    'No se ha podido cargar el mapa.'}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  frame: {
    position: 'relative',
    height: 320,
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#202024',
  },
  webView: {
    flex: 1,
    backgroundColor: '#202024',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  message: {
    color: '#D8D8DC',
    textAlign: 'center',
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
    backgroundColor: 'rgba(32, 32, 36, 0.92)',
  },
  statusText: {
    color: '#D8D8DC',
  },
  errorText: {
    color: '#FF6B6B',
    textAlign: 'center',
  },
  openButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 22,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(20, 20, 24, 0.92)',
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  fullScreen: {
    flex: 1,
    backgroundColor: '#141418',
  },
  fullScreenHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1D1D22',
  },
  fullScreenHeaderText: {
    flex: 1,
  },
  fullScreenTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
  },
  fullScreenSubtitle: {
    marginTop: 2,
    color: '#A8A8AE',
    fontSize: 12,
  },
  closeButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 21,
    paddingHorizontal: 16,
    backgroundColor: '#168BFF',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  fullScreenMapFrame: {
    position: 'relative',
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#202024',
  },
  fullScreenWebView: {
    flex: 1,
    backgroundColor: '#202024',
  },
});
