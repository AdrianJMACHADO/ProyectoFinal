import { NavigationHeader } from '@/components/NavigationHeader';
import {
  NavigationChromeProvider,
  useNavigationChrome,
} from '@/contexts/NavigationChromeContext';
import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import {
  createMaterialTopTabNavigator,
  MaterialTopTabBar,
  MaterialTopTabBarProps,
} from '@react-navigation/material-top-tabs';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
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
  const inputRange: number[] = [];
  const outputRange: number[] = [];

  props.state.routes.forEach((_, index) => {
    if (index > 0) {
      inputRange.push(index - 0.5);
      outputRange.push(0.94);
    }
    inputRange.push(index);
    outputRange.push(1);
  });

  const scale = props.position.interpolate({
    inputRange,
    outputRange,
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[
        styles.tabDock,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: theme.background,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.floatingBar,
          {
            borderColor: `${theme.border}B8`,
            shadowColor: theme.shadow,
            transform: [{ scaleX: scale }, { scaleY: scale }],
          },
        ]}
      >
        <BlurView
          tint="dark"
          intensity={Platform.OS === 'ios' ? 72 : 45}
          style={StyleSheet.absoluteFill}
        />
        <MaterialTopTabBar {...props} />
      </Animated.View>
    </View>
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
        tabBar={props => <FloatingTabBar {...props} />}
        screenListeners={{
          state: event => {
            const state = event.data.state;
            const activeRoute = state.routes[state.index];
            setActiveTab(activeRoute.name);
          },
        }}
        screenOptions={({ route }) => ({
          swipeEnabled: Platform.OS !== 'web' && role !== 'EMPLEADO',
          lazy: true,
          animationEnabled: true,
          tabBarShowLabel: true,
          tabBarActiveTintColor: theme.buttonPrimary,
          tabBarInactiveTintColor: theme.placeholder,
          tabBarPressColor: `${theme.buttonPrimary}18`,
          tabBarIndicatorStyle: {
            top: 0,
            height: 3,
            borderRadius: 3,
            backgroundColor: theme.buttonPrimary,
          },
          tabBarStyle: {
            backgroundColor: 'transparent',
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarItemStyle: {
            minHeight: 60,
            paddingHorizontal: 0,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
            textTransform: 'none',
            marginTop: 0,
          },
          tabBarIcon: ({ focused, color }) => {
            const routeIcons = icons[route.name];
            return (
              <Ionicons
                name={focused ? routeIcons.active : routeIcons.inactive}
                size={22}
                color={color}
              />
            );
          },
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
    paddingHorizontal: 10,
    paddingTop: 7,
  },
  floatingBar: {
    overflow: 'hidden',
    borderRadius: 30,
    borderWidth: 1,
    elevation: 14,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
});
