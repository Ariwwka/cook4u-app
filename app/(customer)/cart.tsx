import { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useStripe } from '@stripe/stripe-react-native'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/lib/cart'

export default function CartScreen() {
  const { items, updateQuantity, clearCart, total, chefId } = useCart()
  const { initPaymentSheet, presentPaymentSheet } = useStripe()
  const [loading, setLoading] = useState(false)
  const [addressText, setAddressText] = useState('')

  const cartTotal = total()
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  async function handleCheckout() {
    if (!addressText.trim()) {
      Alert.alert('Delivery address', 'Please enter your delivery address.')
      return
    }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/(auth)/login'); return }

      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/mobile/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          items: items.map(i => ({ menuItemId: i.menuItemId, quantity: i.quantity, price: i.price })),
          chefId: chefId(),
          deliveryAddressText: addressText.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Failed to create payment intent')

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Cook4U',
        paymentIntentClientSecret: json.clientSecret,
        defaultBillingDetails: { name: session.user.user_metadata?.full_name ?? '' },
      })
      if (initError) throw new Error(initError.message)

      const { error: presentError } = await presentPaymentSheet()
      if (presentError) {
        if (presentError.code !== 'Canceled') Alert.alert('Payment failed', presentError.message)
        return
      }

      clearCart()
      Alert.alert('Order placed!', 'Your order has been sent to the chef.', [
        { text: 'View Orders', onPress: () => router.replace('/(customer)/orders') },
      ])
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50 items-center justify-center">
        <Text className="text-5xl mb-4">🛒</Text>
        <Text className="text-gray-500 text-base font-medium">Your cart is empty</Text>
        <TouchableOpacity onPress={() => router.replace('/(customer)/')} className="mt-4 bg-orange-500 px-6 py-3 rounded-2xl">
          <Text className="text-white font-bold">Browse Chefs</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const chefName = items[0]?.chefName ?? 'Chef'

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-800">Your Cart</Text>
        <Text className="text-gray-400 text-sm mt-0.5">From {chefName}</Text>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 200 }}>
        {/* Items */}
        <View className="bg-white rounded-2xl border border-orange-50 mt-3 overflow-hidden">
          {items.map((item, idx) => (
            <View key={item.id} className={`flex-row items-center px-4 py-3 ${idx < items.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <View className="flex-1">
                <Text className="font-semibold text-gray-800">{item.name}</Text>
                <Text className="text-orange-500 text-sm font-bold mt-0.5">£{(item.price * item.quantity).toFixed(2)}</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <TouchableOpacity onPress={() => updateQuantity(item.menuItemId, item.quantity - 1)} className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center">
                  <Text className="text-orange-600 font-bold">−</Text>
                </TouchableOpacity>
                <Text className="font-bold text-gray-800 w-4 text-center">{item.quantity}</Text>
                <TouchableOpacity onPress={() => updateQuantity(item.menuItemId, item.quantity + 1)} className="w-8 h-8 bg-orange-500 rounded-full items-center justify-center">
                  <Text className="text-white font-bold">+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery address */}
        <View className="mt-4">
          <Text className="text-sm font-semibold text-gray-700 mb-1.5">Delivery address</Text>
          <TextInput
            value={addressText}
            onChangeText={setAddressText}
            placeholder="Enter your full delivery address…"
            multiline
            className="bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800 min-h-[60px]"
            textAlignVertical="top"
          />
        </View>

        {/* Summary */}
        <View className="bg-white rounded-2xl border border-orange-50 mt-4 px-4 py-4 gap-2">
          <View className="flex-row justify-between">
            <Text className="text-gray-500 text-sm">Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})</Text>
            <Text className="text-gray-800 text-sm font-medium">£{cartTotal.toFixed(2)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-gray-500 text-sm">Delivery</Text>
            <Text className="text-gray-800 text-sm font-medium">£3.99</Text>
          </View>
          <View className="border-t border-gray-100 pt-2 flex-row justify-between">
            <Text className="font-bold text-gray-800">Total</Text>
            <Text className="font-bold text-orange-500 text-base">£{(cartTotal + 3.99).toFixed(2)}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => { Alert.alert('Clear cart?', 'Remove all items?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: clearCart }]) }} className="mt-3 items-center py-2">
          <Text className="text-gray-400 text-sm">Clear cart</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Checkout button */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 pt-3 pb-8">
        <TouchableOpacity onPress={handleCheckout} disabled={loading} className="bg-orange-500 rounded-2xl py-4 items-center">
          {loading ? <ActivityIndicator color="white" /> : (
            <Text className="text-white font-bold text-base">Pay £{(cartTotal + 3.99).toFixed(2)}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
