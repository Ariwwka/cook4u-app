import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const THIRTY_MIN = 30 * 60 * 1000

const STATUS_LABELS = {
  payment_pending: 'Awaiting Payment',
  pending: 'New Order',
  pending_acceptance: 'New Order',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
  out_for_delivery: 'On the Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_COLORS = {
  payment_pending: { bg: '#F3F4F6', text: '#9CA3AF' },
  pending: { bg: '#FFF7ED', text: '#F97316' },
  pending_acceptance: { bg: '#FFF7ED', text: '#F97316' },
  confirmed: { bg: '#EFF6FF', text: '#3B82F6' },
  preparing: { bg: '#FFFBEB', text: '#D97706' },
  ready: { bg: '#F0FDF4', text: '#16A34A' },
  out_for_delivery: { bg: '#F0FDF4', text: '#16A34A' },
  delivered: { bg: '#F0FDF4', text: '#16A34A' },
  cancelled: { bg: '#FEF2F2', text: '#EF4444' },
}

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false)
  const statusInfo = STATUS_COLORS[order.status] ?? { bg: '#F3F4F6', text: '#6B7280' }
  const label = STATUS_LABELS[order.status] ?? order.status
  const chefName = order.profiles?.full_name ?? 'Chef'
  const dateStr = new Date(order.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => setExpanded((v) => !v)}
      activeOpacity={0.8}
    >
      <View style={styles.orderCardTop}>
        <Text style={styles.orderChefName}>{chefName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.text }]}>{label}</Text>
        </View>
      </View>

      <View style={styles.orderCardBottom}>
        <Text style={styles.orderDate}>{dateStr}</Text>
        <Text style={styles.orderMeta}>
          {order.item_count ?? 0} item{(order.item_count ?? 0) !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.orderTotal}>£{Number(order.total ?? 0).toFixed(2)}</Text>
      </View>

      {expanded && (
        <View style={styles.expandedSection}>
          {(order.order_items ?? []).map((oi) => (
            <View key={oi.id} style={styles.lineItem}>
              <Text style={styles.lineItemQty}>{oi.quantity}×</Text>
              <Text style={styles.lineItemName}>{oi.menu_items?.name ?? 'Item'}</Text>
              <Text style={styles.lineItemPrice}>
                £{Number((oi.unit_price ?? 0) * oi.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
          {order.delivery_address_text ? (
            <Text style={styles.deliveryAddr}>📍 {order.delivery_address_text}</Text>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  )
}

export default function OrdersScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles:chef_id(full_name), order_items(id, quantity, unit_price, menu_items(name))')
        .eq('customer_id', user.id)
        .not('status', 'eq', 'payment_failed')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
      } else {
        const now = Date.now()
        const filtered = (data || []).filter((o) => {
          if (o.status === 'payment_pending') {
            return now - new Date(o.created_at).getTime() < THIRTY_MIN
          }
          return true
        })
        const withCount = filtered.map((o) => ({
          ...o,
          item_count: o.order_items?.reduce((sum, i) => sum + (i.quantity ?? 1), 0) ?? 0,
        }))
        setOrders(withCount)
      }
    } catch (err) {
      console.error('fetchOrders exception:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#F97316" size="large" />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OrderCard order={item} />}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🍴</Text>
              <Text style={styles.emptyText}>No orders yet</Text>
              <Text style={styles.emptySubText}>Browse chefs and place your first order</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1C1C1E' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 20, paddingTop: 16 },
  orderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  orderChefName: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '600' },
  orderCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderDate: { fontSize: 13, color: '#6B7280', flex: 1 },
  orderMeta: { fontSize: 13, color: '#6B7280' },
  orderTotal: { fontSize: 15, fontWeight: 'bold', color: '#1C1C1E' },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  lineItemQty: { fontSize: 13, color: '#9CA3AF', width: 28 },
  lineItemName: { flex: 1, fontSize: 13, color: '#1C1C1E' },
  lineItemPrice: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  deliveryAddr: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  emptyContainer: { paddingTop: 80, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 },
  emptySubText: { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },
})
