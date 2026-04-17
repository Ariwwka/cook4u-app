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
  const deliveryFee = 3.99
  const grandTotal = cartTotal + deliveryFee
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)

  async function handleCheckout() {
    if (!addressText.trim()) {
      Alert.alert('Delivery address required', 'Please enter your delivery address.')
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
      Alert.alert('Order placed! 🎉', 'Your order has been sent to the chef.', [
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
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 64, marginBottom: 16 }}>🛒</Text>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>Your cart is empty</Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Add some dishes from a chef</Text>
        <TouchableOpacity
          onPress={() => router.replace('/(customer)/')}
          style={{ marginTop: 20, backgroundColor: '#f97316', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 16 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Browse Chefs</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const chefName = items[0]?.chefName ?? 'Chef'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }}>Your Cart</Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>From {chefName}</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 180 }}>
        {/* Items */}
        <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
          {items.map((item, idx) => (
            <View key={item.id} style={{
              flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
              borderBottomWidth: idx < items.length - 1 ? 1 : 0, borderBottomColor: '#f3f4f6',
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{item.name}</Text>
                <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>£{item.price.toFixed(2)} each</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                  style={{ width: 32, height: 32, backgroundColor: '#f3f4f6', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#374151', fontSize: 17, fontWeight: '700' }}>−</Text>
                </TouchableOpacity>
                <Text style={{ fontWeight: '800', color: '#111827', fontSize: 15, minWidth: 20, textAlign: 'center' }}>{item.quantity}</Text>
                <TouchableOpacity
                  onPress={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                  style={{ width: 32, height: 32, backgroundColor: '#f97316', borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>+</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#f97316', minWidth: 48, textAlign: 'right' }}>£{(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Delivery address */}
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 }}>Delivery address</Text>
          <TextInput
            value={addressText}
            onChangeText={setAddressText}
            placeholder="Enter your full delivery address…"
            multiline
            placeholderTextColor="#9ca3af"
            style={{
              backgroundColor: '#fff', borderWidth: 1.5, borderColor: addressText ? '#f97316' : '#e5e7eb',
              borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
              fontSize: 14, color: '#111827', minHeight: 70, textAlignVertical: 'top',
            }}
          />
        </View>

        {/* Summary */}
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 }}>Order summary</Text>
          <View style={{ gap: 10 }}>
            <Row label={`Subtotal (${itemCount} item${itemCount !== 1 ? 's' : ''})`} value={`£${cartTotal.toFixed(2)}`} />
            <Row label="Delivery fee" value={`£${deliveryFee.toFixed(2)}`} />
            <View style={{ height: 1, backgroundColor: '#f3f4f6', marginVertical: 4 }} />
            <Row label="Total" value={`£${grandTotal.toFixed(2)}`} bold />
          </View>
        </View>

        <TouchableOpacity
          onPress={() => Alert.alert('Clear cart?', 'Remove all items?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear', style: 'destructive', onPress: clearCart }])}
          style={{ alignItems: 'center', paddingVertical: 14 }}
        >
          <Text style={{ color: '#9ca3af', fontSize: 13 }}>Clear cart</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Checkout bar */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32,
      }}>
        <TouchableOpacity
          onPress={handleCheckout}
          disabled={loading}
          style={{
            backgroundColor: '#111827', borderRadius: 18, paddingVertical: 17,
            alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
          }}
        >
          {loading ? <ActivityIndicator color="white" /> : (
            <>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Pay</Text>
              <Text style={{ color: '#f97316', fontWeight: '800', fontSize: 18 }}>£{grandTotal.toFixed(2)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 14, color: bold ? '#111827' : '#6b7280', fontWeight: bold ? '700' : '400' }}>{label}</Text>
      <Text style={{ fontSize: 14, color: bold ? '#f97316' : '#111827', fontWeight: bold ? '800' : '600' }}>{value}</Text>
    </View>
  )
}
