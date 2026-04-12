import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { Link, Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { palette } from '@/src/theme/palette';

function HeaderAction() {
  return (
    <Link href="/modal" asChild>
      <Pressable
        style={{
          borderRadius: 999,
          backgroundColor: palette.surfaceStrong,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Text style={{ color: palette.textPrimary, fontWeight: '700' }}>Scenario</Text>
      </Pressable>
    </Link>
  );
}

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
          headerRight: HeaderAction,
        }}
      />
      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'Deliveries',
          tabBarLabel: 'Deliveries',
          tabBarIcon: ({ color }) => <FontAwesome name="dropbox" size={18} color={color} />,
          headerRight: HeaderAction,
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: 'Network',
          tabBarLabel: 'Network',
          tabBarIcon: ({ color }) => <FontAwesome name="exchange" size={18} color={color} />,
          headerRight: HeaderAction,
        }}
      />
      <Tabs.Screen
        name="auth"
        options={{
          title: 'Auth',
          tabBarLabel: 'Auth',
          tabBarIcon: ({ color }) => <FontAwesome name="shield" size={18} color={color} />,
          headerRight: HeaderAction,
        }}
      />
    </Tabs>
  );
}
