import { NavigationHeader } from '@/components/NavigationHeader';
import {
  NavigationChromeProvider,
  useNavigationChrome,
} from '@/contexts/NavigationChromeContext';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBarProps,
} from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import FeriasScreen from './ferias';
import GraficosFeriasScreen from './graficos-ferias';
import GraficosTicketsScreen from './graficos-tickets';
import TicketsScreen from './tickets';
import UsersScreen from './usuarios';

type AppTabParamList = {
  Tickets: undefined;
  Ferias: undefined;
  Uso: undefined;
  FeriasStats: undefined;
  Usuarios: undefined;
};

const Tab = createMaterialTopTabNavigator<AppTabParamList>();

const icons: Record<
  keyof AppTabParamList,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  Tickets: { active: 'ticket', inactive: 'ticket-outline' },
  Ferias: { active: 'calendar', inactive: 'calendar-outline' },
  Uso: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  FeriasStats: { active: 'pie-chart', inactive: 'pie-chart-outline' },
  Usuarios: { active: 'people', inactive: 'people-outline' },
};

function FloatingTabBar(props: MaterialTopTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isTabBarCompact, setActiveTab } = useNavigationChrome();
  const progress = useRef(new Animated.Value(0)).current;
  const [tabsWidth, setTabsWidth] = useState(0);

  useEffect(() => {
    Animated.spring(progress, {
      toValue: isTabBarCompact ? 1 : 0,
      damping: 22,
      stiffness: 230,
      mass: 0.8,
      useNativeDriver: false,
    }).start();
  }, [isTabBarCompact, progress]);

  const barHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [70, 52],
  });
  const horizontalMargin = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 44],
  });
  const labelOpacity = progress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 0, 0],
  });
  const labelHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [17, 0],
  });

  return (
    <Animated.View
      style={[
        styles.tabDock,
        {
          bottom: Math.max(insets.bottom, 8),
          marginHorizontal: horizontalMargin,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.floatingBar,
          {
            height: barHeight,
            borderColor: `${theme.border}B8`,
            shadowColor: theme.shadow,
            backgroundColor:
              Platform.OS === 'ios'
                ? 'rgba(24, 24, 27, 0.38)'
                : 'rgba(28, 28, 32, 0.78)',
          },
        ]}
      >
        <BlurView
          tint="dark"
          intensity={Platform.OS === 'ios' ? 78 : 65}
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.glassTint,
            Platform.OS === 'web' && styles.webGlass,
          ]}
        />
        <View
          style={styles.tabItems}
          onLayout={event => setTabsWidth(event.nativeEvent.layout.width)}
        >
          {tabsWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activePill,
                {
                  width: (tabsWidth - 10) / props.state.routes.length,
                  backgroundColor: `${theme.buttonPrimary}1F`,
                  transform: [
                    {
                      translateX: Animated.multiply(
                        props.position,
                        (tabsWidth - 10) / props.state.routes.length,
                      ),
                    },
                  ],
                },
              ]}
            />
          )}
          {props.state.routes.map((route, index) => {
            const focused = props.state.index === index;
            const options = props.descriptors[route.key].options;
            const color = focused
              ? theme.buttonPrimary
              : theme.placeholder;
            const routeIcons = icons[route.name as keyof AppTabParamList];
            const label =
              typeof options.title === 'string' ? options.title : route.name;

            const onPress = () => {
              setActiveTab(route.name);
              const event = props.navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                props.navigation.navigate(route.name, route.params);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                onPress={onPress}
                style={({ pressed }) => [
                  styles.tabItem,
                  pressed && styles.tabItemPressed,
                ]}
              >
                <Ionicons
                  name={focused ? routeIcons.active : routeIcons.inactive}
                  size={isTabBarCompact ? 21 : 23}
                  color={color}
                />
                <Animated.View
                  style={{
                    height: labelHeight,
                    opacity: labelOpacity,
                    overflow: 'hidden',
                  }}
                >
                  <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                    {label}
                  </Text>
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function AppTabsContent() {
  const { user, role } = useAuth();
  const theme = useTheme();
  const { activeHeader, setActiveTab } = useNavigationChrome();

  if (!user) return null;

  return (
    <View style={[styles.shell, { backgroundColor: theme.background }]}>
      <NavigationHeader {...activeHeader} />
      <Tab.Navigator
        tabBarPosition="bottom"
        initialRouteName="Tickets"
        initialLayout={{ width: Dimensions.get('window').width }}
        tabBar={props => <FloatingTabBar {...props} />}
        screenListeners={{
          state: event => {
            const state = event.data.state;
            const activeRoute = state.routes[state.index];
            setActiveTab(activeRoute.name);
          },
          tabPress: () => {
            setActiveTab(activeHeader ? activeHeader as never : 'Tickets');
          },
        }}
        screenOptions={({ route }) => ({
          swipeEnabled: Platform.OS !== 'web' && role !== 'EMPLEADO',
          lazy: true,
          animationEnabled: true,
        })}
      >
        <Tab.Screen
          name="Tickets"
          component={TicketsScreen}
          options={{ title: role === 'EMPLEADO' ? 'Escanear' : 'Tickets' }}
        />
        {role !== 'EMPLEADO' && (
          <>
            <Tab.Screen name="Ferias" component={FeriasScreen} />
            <Tab.Screen
              name="Uso"
              component={GraficosTicketsScreen}
              options={{ title: 'Uso' }}
            />
            <Tab.Screen
              name="FeriasStats"
              component={GraficosFeriasScreen}
              options={{ title: 'Gráficas' }}
            />
            <Tab.Screen
              name="Usuarios"
              component={UsersScreen}
              options={{ title: 'Usuarios' }}
            />
          </>
        )}
      </Tab.Navigator>
    </View>
  );
}

export default function AppTabs() {
  return (
    <NavigationChromeProvider>
      <AppTabsContent />
    </NavigationChromeProvider>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  tabDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 100,
  },
  floatingBar: {
    overflow: 'hidden',
    borderRadius: 35,
    borderWidth: 1,
    elevation: 14,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  glassTint: {
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
  },
  webGlass: {
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  } as any,
  tabItems: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 5,
  },
  tabItem: {
    flex: 1,
    height: '100%',
    minWidth: 0,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    zIndex: 1,
  },
  activePill: {
    position: 'absolute',
    left: 5,
    top: 5,
    bottom: 5,
    borderRadius: 24,
  },
  tabItemPressed: {
    opacity: 0.72,
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
