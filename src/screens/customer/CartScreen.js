import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { supabase } from '../../lib/supabase'

export default function CartScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const { items, cartChefName, addItem, removeItem, clearCart, subtotal, serviceFee, total, itemCount } = useCart()
  const [notes, setNotes] = useState('')
  const [defaultAddress, setDefaultAddress] = useState(null)
  const [placing, setPlacing] = useState(false)

  const fetchDefaultAddress = useCallback(async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('customer_id', user.id)
      .eq('is_default', true)
      .single()
    if (data) setDefaultAddress(data)
  }, [user?.id])

  useEffect(() => {
    fetchDefaultAddress()
  }, [fetchDefaultAddress])

  async function handleCheckout() {
    if (!defaultAddress) {
      Alert.alert(
        'No Address',
        'Please add a delivery address in your account settings before ordering.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Address',
            onPress: () => navigation.navigate('AccountTab'),
          },
        ]
      )
      return
    }

    setPlacing(true)
    try {
      const deliveryText = [
        defaultAddress.line1,
        defaultAddress.line2,
        defaultAddress.city,
        defaultAddress.postcode,
      ]
        .filter(Boolean)
        .join(', ')

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          items: items.map((i) => ({
            menuItemId: i.menuItemId,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
          chef_id: items[0] ? undefined : null,
          customer_id: user.id,
          delivery_address_text: deliveryText,
          delivery_address_id: defaultAddress.id,
          notes: notes.trim() || null,
        },
      })

      if (error || data?.error) {
        Alert.alert('Error', data?.error ?? 'Could not create your order. Please try again.')
        return
      }

      if (data?.checkoutUrl) {
        clearCart()
        await Linking.openURL(data.checkoutUrl)
        navigation.navigate('OrdersTab')
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  function handleClearCart() {
    Alert.alert('Clear Cart', 'Remove all items from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clearCart },
    ])
  }

  if (itemCount === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cart</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubText}>Browse chefs and add dishes to get started</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('BrowseTab')}
            activeOpacity={0.85}
          >
            <Text style={styles.browseButtonText}>Browse Chefs</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cart</Text>
        <TouchableOpacity onPress={handleClearCart} activeOpacity={0.7}>
          <Text style={styles.clearText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.menuItemId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          cartChefName ? (
            <Text style={styles.chefLabel}>From: <Text style={styles.chefLabelBold}>{cartChefName}</Text></Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>£{(item.price * item.quantity).toFixed(2)}</Text>
            </View>
            <View style={styles.qtyControls}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => removeItem(item.menuItemId)}
                activeOpacity={0.7}
              >
                <Ionicons name="remove" size={18} color="#F97316" />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() =>
                  addItem(
                    { id: item.menuItemId, name: item.name, price: item.price },
                    null,
                    null
                  )
                }
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={18} color="#F97316" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Delivery notes (optional)</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Leave at door, ring bell..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.addressSection}>
              <View style={styles.addressSectionLeft}>
                <Ionicons name="location-outline" size={18} color="#6B7280" />
                <Text style={styles.addressSectionLabel}>Delivering to</Text>
              </View>
              {defaultAddress ? (
                <Text style={styles.addressText}>
                  {defaultAddress.line1}, {defaultAddress.city}
                </Text>
              ) : (
                <TouchableOpacity onPress={() => navigation.navigate('AccountTab')} activeOpacity={0.7}>
                  <Text style={styles.addAddressLink}>Add delivery address →</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>£{subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Service fee (10%)</Text>
                <Text style={styles.totalValue}>£{serviceFee.toFixed(2)}</Text>
              </View>
              <View style={[styles.totalRow, styles.totalRowFinal]}>
                <Text style={styles.totalLabelBold}>Total</Text>
                <Text style={styles.totalValueBold}>£{total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        }
      />

      <View style={[styles.checkoutBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.checkoutButton, placing && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={placing}
          activeOpacity={0.85}
        >
          {placing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.checkoutButtonText}>Place Order</Text>
              <Text style={styles.checkoutButtonPrice}>£{total.toFixed(2)}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C1C1E' },
  clearText: { fontSize: 15, color: '#EF4444', fontWeight: '500' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 8 },
  emptySubText: { fontSize: 15, color: '#6B7280', textAlign: 'center', marginBottom: 32 },
  browseButton: {
    height: 50,
    paddingHorizontal: 32,
    backgroundColor: '#F97316',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  listContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  chefLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 12 },
  chefLabelBold: { fontWeight: '600', color: '#6B7280' },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1C1C1E', marginBottom: 2 },
  itemPrice: { fontSize: 14, color: '#F97316', fontWeight: '600' },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { fontSize: 16, fontWeight: 'bold', color: '#1C1C1E', minWidth: 20, textAlign: 'center' },
  footer: { paddingTop: 20 },
  notesContainer: { marginBottom: 20 },
  notesLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  notesInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1C1C1E',
    backgroundColor: '#FAFAFA',
    minHeight: 60,
  },
  addressSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addressSectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  addressSectionLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  addressText: { fontSize: 14, color: '#1C1C1E', fontWeight: '500' },
  addAddressLink: { fontSize: 14, color: '#F97316', fontWeight: '600' },
  totalsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 100,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  totalRowFinal: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginBottom: 0,
  },
  totalLabel: { fontSize: 14, color: '#6B7280' },
  totalValue: { fontSize: 14, color: '#1C1C1E' },
  totalLabelBold: { fontSize: 16, fontWeight: 'bold', color: '#1C1C1E' },
  totalValueBold: { fontSize: 16, fontWeight: 'bold', color: '#F97316' },
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  checkoutButton: {
    height: 56,
    backgroundColor: '#F97316',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  checkoutButtonDisabled: { opacity: 0.6 },
  checkoutButtonText: { fontSize: 17, fontWeight: 'bold', color: '#FFFFFF' },
  checkoutButtonPrice: { fontSize: 17, fontWeight: 'bold', color: 'rgba(255,255,255,0.85)' },
})
