import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import FeriasScreen from './ferias';
import TicketsScreen from './tickets';

// Placeholder components for charts (to be implemented)
const FairCharts = () => null;
const TicketCharts = () => null;

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Ferias':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Tickets':
              iconName = focused ? 'ticket' : 'ticket-outline';
              break;
            case 'Gráficos Ferias':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
            case 'Gráficos Tickets':
              iconName = focused ? 'pie-chart' : 'pie-chart-outline';
              break;
            default:
              iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Ferias" component={FeriasScreen} />
      <Tab.Screen name="Tickets" component={TicketsScreen} />
      <Tab.Screen name="Gráficos Ferias" component={FairCharts} />
      <Tab.Screen name="Gráficos Tickets" component={TicketCharts} />
    </Tab.Navigator>
  );
} 