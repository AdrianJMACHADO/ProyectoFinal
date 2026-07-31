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
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import FeriasScreen from './ferias';
import GraficosFeriasScreen from './graficos-ferias';
import GraficosTicketsScreen from './graficos-tickets';
import TicketsScreen from './tickets';
import AjustesScreen from './ajustes';

type AppTabParamList = {
  Tickets: undefined;
  Ferias: undefined;
  Uso: undefined;
  FeriasStats: undefined;
  Ajustes: undefined;
};

const Tab = createMaterialTopTabNavigator<AppTabParamList>();
const EmbeddedSettingsScreen = () => <AjustesScreen embedded />;

const icons: Record<
  keyof AppTabParamList,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  Tickets: { active: 'ticket', inactive: 'ticket-outline' },
  Ferias: { active: 'calendar', inactive: 'calendar-outline' },
  Uso: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  FeriasStats: { active: 'pie-chart', inactive: 'pie-chart-outline' },
  Ajustes: { active: 'settings', inactive: 'settings-outline' },
};

function FloatingTabBar(props: MaterialTopTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isTabBarCompact, setActiveTab } = useNavigationChrome();
  const progress = useRef(new Animated.Value(0)).current;
  const [tabsWidth, setTabsWidth] = useState(0);
  const routeCount = props.state.routes.length;
  const useRealBlur = Platform.OS === 'ios';

  useEffect(() => {
    const animation = Animated.spring(progress, {
      toValue: isTabBarCompact ? 1 : 0,
      damping: 22,
      stiffness: 230,
      mass: 0.8,
      // height y marginHorizontal son propiedades de layout. En Android/web
      // mantenemos esta animación corta, pero evitamos combinarla con blur real.
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
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
    inputRange: [0, 0.58, 1],
    outputRange: [1, 0, 0],
  });
  const iconTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });
  const iconScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 21 / 23],
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
            backgroundColor: useRealBlur
              ? 'rgba(24, 24, 27, 0.38)'
              : 'rgba(28, 28, 32, 0.94)',
          },
        ]}
      >
        {useRealBlur && (
          <BlurView
            tint="dark"
            intensity={78}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.glassTint,
            Platform.OS === 'web' && styles.webGlass,
          ]}
        />
        <View
          style={styles.tabItems}
          onLayout={event => {
            const measuredWidth = Math.round(event.nativeEvent.layout.width);
            setTabsWidth(current =>
              current === measuredWidth ? current : measuredWidth,
            );
          }}
        >
          {tabsWidth > 0 && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activePill,
                {
                  width: (tabsWidth - 10) / routeCount,
                  backgroundColor: `${theme.buttonPrimary}1F`,
                  transform: [
                    {
                      translateX:
                        routeCount === 1
                          ? 0
                          : Animated.multiply(
                              props.position,
                              (tabsWidth - 10) / routeCount,
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
            const routeIcons = icons[route.name as keyof AppTabParamList];
            const label =
              typeof options.title === 'string' ? options.title : route.name;
            const activeOpacity =
              routeCount === 1
                ? 1
                : props.position.interpolate({
                    inputRange: props.state.routes.map(
                      (_, routeIndex) => routeIndex,
                    ),
                    outputRange: props.state.routes.map((_, routeIndex) =>
                      routeIndex === index ? 1 : 0,
                    ),
                    extrapolate: 'clamp',
                  });

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
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.tabIconLayer,
                    {
                      transform: [
                        { translateY: iconTranslateY },
                        { scale: iconScale },
                      ],
                    },
                  ]}
                >
                  <Ionicons
                    name={routeIcons.inactive}
                    size={23}
                    color={theme.placeholder}
                  />
                  <Animated.View
                    style={[styles.activeIconLayer, { opacity: activeOpacity }]}
                  >
                    <Ionicons
                      name={routeIcons.active}
                      size={23}
                      color={theme.buttonPrimary}
                    />
                  </Animated.View>
                </Animated.View>
                <Animated.View
                  pointerEvents="none"
                  style={[styles.tabLabelLayer, { opacity: labelOpacity }]}
                >
                  <Text
                    style={[styles.tabLabel, { color: theme.placeholder }]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                  <Animated.View
                    style={[styles.activeLabelLayer, { opacity: activeOpacity }]}
                  >
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: theme.buttonPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </Animated.View>
                </Animated.View>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function FloatingActions() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { activeActions } = useNavigationChrome();
  const createProgress = useRef(new Animated.Value(0)).current;
  const scanProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(createProgress, {
      toValue: activeActions.onCreate ? 1 : 0,
      duration: activeActions.onCreate ? 90 : 190,
      useNativeDriver: true,
    }).start();
  }, [activeActions.onCreate, createProgress]);

  useEffect(() => {
    Animated.timing(scanProgress, {
      toValue: activeActions.onScan ? 1 : 0,
      duration: activeActions.onScan ? 90 : 190,
      useNativeDriver: true,
    }).start();
  }, [activeActions.onScan, scanProgress]);

  if (width >= 600) return null;

  const bottom = Math.max(insets.bottom, 8) + 86;
  const actionStyle = (progressValue: Animated.Value) => ({
    opacity: progressValue,
    transform: [
      {
        translateY: progressValue.interpolate({
          inputRange: [0, 1],
          outputRange: [10, 0],
        }),
      },
      {
        scale: progressValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0.9, 1],
        }),
      },
    ],
  });

  return (
    <>
      <Animated.View
        pointerEvents={activeActions.onScan ? 'auto' : 'none'}
        style={[
          styles.globalAction,
          styles.scanAction,
          { bottom, backgroundColor: theme.buttonPrimary },
          actionStyle(scanProgress),
        ]}
      >
        <TouchableOpacity
          accessibilityLabel="Escanear código QR"
          style={styles.globalActionButton}
          onPress={activeActions.onScan}
        >
          <Ionicons name="scan" size={26} color="white" />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View
        pointerEvents={activeActions.onCreate ? 'auto' : 'none'}
        style={[
          styles.globalAction,
          styles.createAction,
          { bottom, backgroundColor: '#FFC107' },
          actionStyle(createProgress),
        ]}
      >
        <TouchableOpacity
          accessibilityLabel="Crear"
          style={styles.globalActionButton}
          onPress={activeActions.onCreate}
        >
          <Ionicons name="add" size={26} color="white" />
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

function AppTabsContent() {
  const { user, role } = useAuth();
  const theme = useTheme();
  const { activeHeader, setActiveTab } = useNavigationChrome();

  if (!user) return null;

  if (role === 'EMPLEADO') {
    return (
      <View style={[styles.shell, { backgroundColor: theme.background }]}>
        <NavigationHeader {...activeHeader} />
        <View style={styles.employeeScreen}>
          <TicketsScreen />
        </View>
        <FloatingActions />
      </View>
    );
  }

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
        }}
        screenOptions={() => ({
          swipeEnabled: Platform.OS !== 'web',
          lazy: true,
          animationEnabled: true,
        })}
      >
        <Tab.Screen
          name="Tickets"
          component={TicketsScreen}
          options={{ title: 'Tickets' }}
        />
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
          name="Ajustes"
          component={EmbeddedSettingsScreen}
          options={{ title: 'Ajustes' }}
        />
      </Tab.Navigator>
      <FloatingActions />
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
  employeeScreen: {
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
    // Capa de cristal estática. backdrop-filter sobre una barra animada
    // repinta continuamente en navegador y es el principal cuello de botella.
    backgroundColor: 'rgba(255, 255, 255, 0.025)',
  },
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
    zIndex: 1,
  },
  tabIconLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -12,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabelLayer: {
    position: 'absolute',
    left: 2,
    right: 2,
    bottom: 4,
    height: 15,
    overflow: 'hidden',
  },
  activeLabelLayer: {
    ...StyleSheet.absoluteFillObject,
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
  globalAction: {
    position: 'absolute',
    zIndex: 110,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 7,
  },
  globalActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  scanAction: {
    left: 16,
  },
  createAction: {
    right: 16,
  },
});
