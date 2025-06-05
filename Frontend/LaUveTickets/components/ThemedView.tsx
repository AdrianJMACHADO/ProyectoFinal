import { useThemeColor } from '@/hooks/useThemeColor';
import { View, ViewProps } from 'react-native';

type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'card' | 'input' | 'modal';
};

export function ThemedView(props: ThemedViewProps) {
  const { style, lightColor, darkColor, type = 'default', ...otherProps } = props;
  
  const getBackgroundColor = () => {
    switch (type) {
      case 'card':
        return useThemeColor('card', { light: lightColor, dark: darkColor });
      case 'input':
        return useThemeColor('inputBackground', { light: lightColor, dark: darkColor });
      case 'modal':
        return useThemeColor('modalBackground', { light: lightColor, dark: darkColor });
      default:
        return useThemeColor('background', { light: lightColor, dark: darkColor });
    }
  };

  return (
    <View
      style={[
        {
          backgroundColor: getBackgroundColor(),
        },
        style,
      ]}
      {...otherProps}
    />
  );
}
