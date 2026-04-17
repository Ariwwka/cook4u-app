import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
    </View>
  )
}

export default function CustomerLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#f97316',
      tabBarInactiveTintColor: '#9ca3af',
      tabBarStyle: {
        borderTopColor: '#f3f4f6',
        borderTopWidth: 1,
        backgroundColor: '#fff',
        height: 60,
        paddingBottom: 8,
        paddingTop: 4,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Browse', tabBarIcon: ({ focused }) => <TabIcon emoji="🍽️" focused={focused} /> }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} /> }} />
      <Tabs.Screen name="chef/[id]" options={{ href: null }} />
    </Tabs>
  )
}
