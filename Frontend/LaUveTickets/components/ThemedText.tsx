import { useThemeColor } from '@/hooks/useThemeColor';
import { Text, TextProps, TextStyle } from 'react-native';

type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'subtitle' | 'caption' | 'button';
};

export function ThemedText(props: ThemedTextProps) {
  const { style, lightColor, darkColor, type = 'default', ...otherProps } = props;
  const color = useThemeColor(type === 'title' ? 'primary' : 'text', { light: lightColor, dark: darkColor });

  const getTextStyle = (): TextStyle => {
    switch (type) {
      case 'title':
        return {
          fontSize: 24,
          fontWeight: '700',
          color,
        };
      case 'subtitle':
        return {
          fontSize: 18,
          fontWeight: '600',
          color,
        };
      case 'caption':
        return {
          fontSize: 14,
          color,
        };
      case 'button':
        return {
          fontSize: 16,
          fontWeight: '600',
          color,
        };
      default:
        return {
          fontSize: 16,
          color,
        };
    }
  };

  return <Text style={[getTextStyle(), style]} {...otherProps} />;
}
