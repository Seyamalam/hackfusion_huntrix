import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Tabs } from 'expo-router';

import { palette } from '@/src/theme/palette';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: palette.shell },
        headerShadowVisible: false,
        headerTintColor: palette.textPrimary,
        headerTitleStyle: { fontWeight: '700' },
        sceneStyle: { backgroundColor: palette.canvas },
        tabBarActiveTintColor: palette.alert,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: palette.shell,
          borderTopColor: palette.border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Command',
          tabBarLabel: 'Command',
          tabBarIcon: ({ color }) => <FontAwesome name="dashboard" size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'Deliveries',
          tabBarLabel: 'Deliveries',
          tabBarIcon: ({ color }) => <FontAwesome name="dropbox" size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: 'Network',
          tabBarLabel: 'Network',
          tabBarIcon: ({ color }) => <FontAwesome name="exchange" size={18} color={color} />,
        }}
      />
      <Tabs.Screen
        name="auth"
        options={{
          title: 'Auth',
          tabBarLabel: 'Auth',
          tabBarIcon: ({ color }) => <FontAwesome name="shield" size={18} color={color} />,
        }}
      />
    </Tabs>
  );
}
