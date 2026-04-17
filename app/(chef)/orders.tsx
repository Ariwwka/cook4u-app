import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/types'

const NEXT_ACTION: Record<string, { label: string; next: string; emoji: string }> = {
  pending_acceptance: { label: 'Accept Order', next: 'confirmed', emoji: '✓' },
  confirmed: { label: 'Start Preparing', next: 'preparing', emoji: '👨‍🍳' },
  preparing: { label: 'Mark Ready', next: 'ready', emoji: '✓' },
  ready: { label: 'Book Courier', next: 'out_for_delivery', emoji: '🛵' },
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; border: string; accent: string }> = {
  pending_acceptance: { label: 'New Order', bg: '#fffbeb', border: '#fde68a', accent: '#f59e0b' },
  confirmed: { label: 'Confirmed', bg: '#eff6ff', border: '#bfdbfe', accent: '#3b82f6' },
  preparing: { label: 'Preparing', bg: '#f5f3ff', border: '#ddd6fe', accent: '#8b5cf6' },
  ready: { label: 'Ready', bg: '#f0fdf4', border: '#bbf7d0', accent: '#22c55e' },
  out_for_delivery: { label: 'Out for Delivery', bg: '#f0fdfa', border: '#99f6e4', accent: '#14b8a6' },
}

export default function ChefOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('orders')
      .select('id, status, total, created_at, delivery_address_text, order_items(id, quantity, unit_price, menu_item:menu_items(name)), customer:profiles!orders_customer_id_fkey(full_name)')
      .eq('chef_id', user.id)
      .not('status', 'in', '("delivered","cancelled","payment_pending")')
      .order('created_at', { ascending: true })
    setOrders((data as unknown as Order[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    const channel = supabase.channel('chef_orders_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  async function doAdvance(order: Order, next: string) {
    setActionLoading(order.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/mobile/chef/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status: next }),
      })
      const json = await res.json()
      if (!res.ok) Alert.alert('Error', json.error ?? 'Failed to update order')
      else await fetchOrders()
    } catch {
      Alert.alert('Error', 'Network error — please retry')
    } finally {
      setActionLoading(null)
    }
  }

  function handleAdvance(order: Order) {
    const action = NEXT_ACTION[order.status]
    if (!action) return
    if (action.next === 'out_for_delivery') {
      Alert.alert('Book Courier', `Dispatch a Gophr courier for order #${order.id.slice(-6).toUpperCase()}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Book & Dispatch', onPress: () => doAdvance(order, action.next) },
      ])
    } else {
      doAdvance(order, action.next)
    }
  }

  function handleDecline(order: Order) {
    Alert.alert('Decline order?', 'The customer will be refunded.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => doAdvance(order, 'cancelled') },
    ])
  }

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}><ActivityIndicator color="#f97316" size="large" /></View>

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }}>Orders</Text>
          {orders.length > 0 && <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 1 }}>{orders.length} active</Text>}
        </View>
        {orders.filter(o => o.status === 'pending_acceptance').length > 0 && (
          <View style={{ backgroundColor: '#f97316', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{orders.filter(o => o.status === 'pending_acceptance').length} new</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders() }} tintColor="#f97316" />}
      >
        {orders.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>📋</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>No active orders</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>New orders will appear here</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {orders.map(order => {
              const cfg = STATUS_CONFIG[order.status] ?? { label: order.status, bg: '#f9fafb', border: '#e5e7eb', accent: '#9ca3af' }
              const action = NEXT_ACTION[order.status]
              const isLoading = actionLoading === order.id
              const customerName = (order.customer as any)?.full_name ?? 'Customer'
              const time = new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              const isNew = order.status === 'pending_acceptance'

              return (
                <View key={order.id} style={{
                  backgroundColor: cfg.bg, borderRadius: 20, borderWidth: 1.5, borderColor: cfg.border, overflow: 'hidden',
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
                }}>
                  {/* Accent strip */}
                  <View style={{ height: 4, backgroundColor: cfg.accent }} />

                  <View style={{ padding: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>#{order.id.slice(-6).toUpperCase()}</Text>
                          {isNew && (
                            <View style={{ backgroundColor: '#f97316', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>NEW</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 3 }}>{customerName} · {time}</Text>
                      </View>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827' }}>£{Number(order.total).toFixed(2)}</Text>
                    </View>

                    {/* Items */}
                    {order.order_items && (
                      <View style={{ marginTop: 12, gap: 4 }}>
                        {order.order_items.map((oi: any) => (
                          <View key={oi.id} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            <View style={{ width: 20, height: 20, backgroundColor: cfg.accent + '30', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 11, fontWeight: '800', color: cfg.accent }}>{oi.quantity}</Text>
                            </View>
                            <Text style={{ fontSize: 14, color: '#374151', fontWeight: '500' }}>{oi.menu_item?.name ?? 'Item'}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {order.delivery_address_text && (
                      <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }} numberOfLines={1}>📍 {order.delivery_address_text}</Text>
                    )}

                    {/* Actions */}
                    {action && (
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                        {isNew && (
                          <TouchableOpacity
                            onPress={() => handleDecline(order)}
                            style={{ flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#fca5a5', alignItems: 'center', backgroundColor: '#fff' }}
                          >
                            <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 14 }}>Decline</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => handleAdvance(order)}
                          disabled={isLoading}
                          style={{
                            flex: isNew ? 2 : 1, paddingVertical: 12, borderRadius: 14, backgroundColor: cfg.accent,
                            alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6,
                            shadowColor: cfg.accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
                          }}
                        >
                          {isLoading ? <ActivityIndicator color="white" size="small" /> : (
                            <>
                              <Text style={{ color: '#fff', fontSize: 16 }}>{action.emoji}</Text>
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{action.label}</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
