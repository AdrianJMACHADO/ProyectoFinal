/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/Colors';
import { useColorScheme } from 'react-native';

type ColorScheme = 'light' | 'dark';
type ColorKey = keyof typeof Colors.light;

/**
 * Hook personalizado para manejar los colores del tema
 * @param colorName - Nombre del color a obtener
 * @param props - Propiedades opcionales para sobrescribir el color
 * @returns El color correspondiente al tema actual
 */
export function useThemeColor(
  colorName: ColorKey,
  props?: { light?: string; dark?: string }
) {
  const theme = useColorScheme() as ColorScheme;
  const colorFromProps = props?.[theme];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[theme][colorName];
}

/**
 * Hook para obtener el tema actual completo
 * @returns El objeto de colores del tema actual
 */
export function useTheme() {
  const theme = useColorScheme() as ColorScheme;
  return Colors[theme];
}

/**
 * Hook para obtener el esquema de color actual
 * @returns 'light' | 'dark'
 */
export function useColorSchemeType(): ColorScheme {
  return useColorScheme() as ColorScheme;
}
