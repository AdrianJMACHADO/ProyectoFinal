import { useThemeColor } from '@/hooks/useThemeColor';
import { View, ViewProps } from 'react-native';

type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'card' | 'input' | 'modal';
};

export function ThemedView(props: ThemedViewProps) {
  const { style, lightColor, darkColor, type = 'default', ...otherProps } = props;
  const colorName =
    type === 'card'
      ? 'card'
      : type === 'input'
        ? 'inputBackground'
        : type === 'modal'
          ? 'modalBackground'
          : 'background';
  const backgroundColor = useThemeColor(colorName, {
    light: lightColor,
    dark: darkColor,
  });

  return (
    <View
      style={[
        {
          backgroundColor,
        },
        style,
      ]}
      {...otherProps}
    />
  );
}
