import type { ComponentType } from 'react';

export type FeriaLocationValue = {
  latitud: number;
  longitud: number;
  ubicacionNombre?: string;
  ubicacionOrigen: 'DISPOSITIVO' | 'MAPA';
};

declare const FeriaLocationPicker: ComponentType<{
  value?: FeriaLocationValue;
  onChange: (value: FeriaLocationValue) => void;
  initialSearch?: string;
}>;

export default FeriaLocationPicker;
