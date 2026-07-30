import type { FeriaRecord } from './firestoreData';

export type FeriaWithLocation = FeriaRecord & {
  latitud: number;
  longitud: number;
};

const EARTH_RADIUS_KM = 6371;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

export const hasFeriaLocation = (
  feria: FeriaRecord,
): feria is FeriaWithLocation =>
  Number.isFinite(feria.latitud) && Number.isFinite(feria.longitud);

export const getFeriaStart = (feria: FeriaRecord) =>
  new Date(feria.fechaInicio ?? feria.fecha);

export const getFeriaEnd = (feria: FeriaRecord) =>
  new Date(feria.fechaFin ?? feria.fechaInicio ?? feria.fecha);

export const calculateDirectDistanceKm = (
  from: FeriaWithLocation,
  to: FeriaWithLocation,
) => {
  const latitudeDelta = radians(to.latitud - from.latitud);
  const longitudeDelta = radians(to.longitud - from.longitud);
  const fromLatitude = radians(from.latitud);
  const toLatitude = radians(to.latitud);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return (
    2 *
    EARTH_RADIUS_KM *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
};

export const buildFeriaRoute = (ferias: FeriaRecord[]) => {
  const located = ferias
    .filter(hasFeriaLocation)
    .sort((a, b) => getFeriaStart(a).getTime() - getFeriaStart(b).getTime());
  const legs = located.slice(1).map((destination, index) => {
    const origin = located[index];
    return {
      origin,
      destination,
      directKm: calculateDirectDistanceKm(origin, destination),
    };
  });
  return {
    ferias: located,
    legs,
    totalDirectKm: legs.reduce((sum, leg) => sum + leg.directKm, 0),
  };
};
