import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { colors } from '../theme/colors';
import { useObdStore } from '../lib/obdStore';
import { ConnectScreen } from '../screens/ConnectScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { HealthScreen } from '../screens/HealthScreen';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accent,
  },
};

export function RootNavigator() {
  const connectionState = useObdStore((s) => s.connectionState);
  const connected = connectionState === 'connected';

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
        }}
      >
        <Tab.Screen
          name="Connect"
          component={ConnectScreen}
          options={{ tabBarLabel: ({ color }) => <Text style={{ color }}>Connect</Text> }}
        />
        {connected && (
          <>
            <Tab.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{ tabBarLabel: ({ color }) => <Text style={{ color }}>Live Data</Text> }}
            />
            <Tab.Screen
              name="Health"
              component={HealthScreen}
              options={{ tabBarLabel: ({ color }) => <Text style={{ color }}>Health</Text> }}
            />
          </>
        )}
      </Tab.Navigator>
    </NavigationContainer>
  );
}
