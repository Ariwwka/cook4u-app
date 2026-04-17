import { Tabs } from 'expo-router'
import { Text } from 'react-native'

export default function CustomerLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#f97316',
      tabBarInactiveTintColor: '#9ca3af',
      tabBarStyle: { borderTopColor: '#f1f5f9', paddingBottom: 4 },
    }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Browse', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🍽️</Text> }}
      />
      <Tabs.Screen
        name="cart"
        options={{ title: 'Cart', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🛒</Text> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: 'Orders', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📦</Text> }}
      />
      <Tabs.Screen
        name="chef/[id]"
        options={{ href: null }}
      />
    </Tabs>
  )
}
