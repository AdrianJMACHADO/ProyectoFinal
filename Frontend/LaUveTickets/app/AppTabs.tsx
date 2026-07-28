import { useTheme } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import React from 'react';
import { Platform } from 'react-native';
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

export default function AppTabs() {
  const { user, role } = useAuth();
  const theme = useTheme();

  if (!user) return null;

  return (
    <Tab.Navigator
      tabBarPosition="bottom"
      initialRouteName="Tickets"
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
          backgroundColor: theme.inputBackground,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.18,
          shadowRadius: 7,
        },
        tabBarItemStyle: {
          minHeight: 64,
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
  );
}
