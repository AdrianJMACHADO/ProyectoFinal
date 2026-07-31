export type FeriaLocationValue = {
  latitud: number;
  longitud: number;
  ubicacionNombre?: string;
  ubicacionOrigen: 'DISPOSITIVO' | 'MAPA';
};

export type FeriaLocationPickerProps = {
  value?: FeriaLocationValue;
  onChange: (value: FeriaLocationValue) => void;
  initialSearch?: string;
};
