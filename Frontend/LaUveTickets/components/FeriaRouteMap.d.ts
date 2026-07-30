import type { ComponentType } from 'react';
import type { FeriaWithLocation } from '../services/feriaTravel';

declare const FeriaRouteMap: ComponentType<{
  ferias: FeriaWithLocation[];
}>;

export default FeriaRouteMap;
