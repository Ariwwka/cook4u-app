import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

import LandingScreen from '../screens/LandingScreen'
import LoginScreen from '../screens/LoginScreen'
import SignUpScreen from '../screens/SignUpScreen'

import BrowseScreen from '../screens/customer/BrowseScreen'
import OrdersScreen from '../screens/customer/OrdersScreen'
import FavouritesScreen from '../screens/customer/FavouritesScreen'
import CustomerAccountScreen from '../screens/customer/AccountScreen'
import ChefDetailScreen from '../screens/customer/ChefDetailScreen'
import CartScreen from '../screens/customer/CartScreen'
import PersonalInfoScreen from '../screens/customer/PersonalInfoScreen'
import AddressesScreen from '../screens/customer/AddressesScreen'
import TermsScreen from '../screens/shared/TermsScreen'

import DashboardScreen from '../screens/chef/DashboardScreen'
import MenusScreen from '../screens/chef/MenusScreen'
import ChefOrdersScreen from '../screens/chef/ChefOrdersScreen'
import ChefAccountScreen from '../screens/chef/ChefAccountScreen'
import ChefPersonalInfoScreen from '../screens/chef/PersonalInfoScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </Stack.Navigator>
  )
}

// Browse stack: Browse → ChefDetail
function BrowseStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Browse" component={BrowseScreen} />
      <Stack.Screen name="ChefDetail" component={ChefDetailScreen} />
    </Stack.Navigator>
  )
}

// Account stack: Account → PersonalInfo / Addresses / Terms
function AccountStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Account" component={CustomerAccountScreen} />
      <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} />
      <Stack.Screen name="Addresses" component={AddressesScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
    </Stack.Navigator>
  )
}

function CustomerTabs() {
  const insets = useSafeAreaInsets()
  const { itemCount } = useCart()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ focused, color }) => {
          let iconName
          if (route.name === 'BrowseTab') {
            iconName = focused ? 'home' : 'home-outline'
          } else if (route.name === 'CartTab') {
            iconName = focused ? 'cart' : 'cart-outline'
          } else if (route.name === 'OrdersTab') {
            iconName = focused ? 'receipt' : 'receipt-outline'
          } else if (route.name === 'FavouritesTab') {
            iconName = focused ? 'heart' : 'heart-outline'
          } else if (route.name === 'AccountTab') {
            iconName = focused ? 'person' : 'person-outline'
          }
          return <Ionicons name={iconName} size={22} color={color} />
        },
      })}
    >
      <Tab.Screen
        name="BrowseTab"
        component={BrowseStack}
        options={{ tabBarLabel: 'Browse' }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{
          tabBarLabel: 'Cart',
          tabBarBadge: itemCount > 0 ? itemCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#F97316', color: '#FFFFFF', fontSize: 10 },
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{ tabBarLabel: 'Orders' }}
      />
      <Tab.Screen
        name="FavouritesTab"
        component={FavouritesScreen}
        options={{ tabBarLabel: 'Favourites' }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountStack}
        options={{ tabBarLabel: 'Account' }}
      />
    </Tab.Navigator>
  )
}

// Chef account stack: ChefAccount → PersonalInfo / Terms
function ChefAccountStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ChefAccount" component={ChefAccountScreen} />
      <Stack.Screen name="ChefPersonalInfo" component={ChefPersonalInfoScreen} />
      <Stack.Screen name="ChefTerms" component={TermsScreen} />
    </Stack.Navigator>
  )
}

function ChefTabs() {
  const insets = useSafeAreaInsets()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#F97316',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: { fontSize: 11 },
        tabBarIcon: ({ focused, color }) => {
          let iconName
          if (route.name === 'DashboardTab') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline'
          } else if (route.name === 'MenusTab') {
            iconName = focused ? 'restaurant' : 'restaurant-outline'
          } else if (route.name === 'ChefOrdersTab') {
            iconName = focused ? 'list' : 'list-outline'
          } else if (route.name === 'ChefAccountTab') {
            iconName = focused ? 'person' : 'person-outline'
          }
          return <Ionicons name={iconName} size={22} color={color} />
        },
      })}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="MenusTab"
        component={MenusScreen}
        options={{ tabBarLabel: 'Menus' }}
      />
      <Tab.Screen
        name="ChefOrdersTab"
        component={ChefOrdersScreen}
        options={{ tabBarLabel: 'Orders' }}
      />
      <Tab.Screen
        name="ChefAccountTab"
        component={ChefAccountStack}
        options={{ tabBarLabel: 'Account' }}
      />
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const { user, profile, loading } = useAuth()

  if (loading) return null

  return (
    <NavigationContainer>
      {!user ? (
        <AuthStack />
      ) : profile?.role === 'chef' ? (
        <ChefTabs />
      ) : (
        <CustomerTabs />
      )}
    </NavigationContainer>
  )
}
