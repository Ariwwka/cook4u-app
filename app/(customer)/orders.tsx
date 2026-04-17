import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/types'

const STATUS_LABEL: Record<string, string> = {
  payment_pending: 'Awaiting payment',
  pending_acceptance: 'Waiting for chef',
  confirmed: 'Confirmed',
  preparing: 'Being prepared',
  ready: 'Ready for pickup',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_STEPS = ['pending_acceptance', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  payment_pending: { bg: '#f9fafb', text: '#6b7280', dot: '#9ca3af' },
  pending_acceptance: { bg: '#fffbeb', text: '#b45309', dot: '#f59e0b' },
  confirmed: { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  preparing: { bg: '#eff6ff', text: '#1d4ed8', dot: '#3b82f6' },
  ready: { bg: '#f5f3ff', text: '#6d28d9', dot: '#8b5cf6' },
  out_for_delivery: { bg: '#f0fdfa', text: '#0f766e', dot: '#14b8a6' },
  delivered: { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e' },
  cancelled: { bg: '#fef2f2', text: '#b91c1c', dot: '#ef4444' },
}

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchOrders = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('orders')
      .select('id, status, total, created_at, gophr_delivery_eta, delivery_address_text, order_items(id, quantity, unit_price, menu_item:menu_items(name)), chef:chef_profiles!orders_chef_id_fkey(profile:profiles!chef_profiles_id_fkey(full_name))')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
    setOrders((data as unknown as Order[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    const channel = supabase.channel('customer_orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}><ActivityIndicator color="#f97316" size="large" /></View>

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.3 }}>My Orders</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders() }} tintColor="#f97316" />}
      >
        {orders.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>📦</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>No orders yet</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Your orders will appear here</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {orders.map(order => <OrderCard key={order.id} order={order} />)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function OrderCard({ order }: { order: Order }) {
  const chefName = (order.chef as any)?.profile?.full_name ?? 'Chef'
  const date = new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  const eta = order.gophr_delivery_eta ? new Date(order.gophr_delivery_eta) : null
  const etaTime = eta ? eta.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.cancelled
  const stepIdx = STATUS_STEPS.indexOf(order.status)
  const progress = stepIdx >= 0 ? (stepIdx + 1) / STATUS_STEPS.length : 0
  const isActive = !['payment_pending', 'cancelled', 'delivered'].includes(order.status)

  return (
    <View style={{
      backgroundColor: '#fff', borderRadius: 20,
      shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
      overflow: 'hidden',
    }}>
      {/* Status bar accent */}
      <View style={{ height: 4, backgroundColor: cfg.dot }} />

      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{chefName}</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>#{order.id.slice(-6).toUpperCase()} · {date}</Text>
          </View>
          <View>
            <View style={{ backgroundColor: cfg.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cfg.dot }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: cfg.text }}>{STATUS_LABEL[order.status] ?? order.status}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#111827', textAlign: 'right', marginTop: 6 }}>£{Number(order.total).toFixed(2)}</Text>
          </View>
        </View>

        {order.order_items && order.order_items.length > 0 && (
          <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 10 }} numberOfLines={1}>
            {order.order_items.map((oi: any) => `${oi.quantity}× ${oi.menu_item?.name ?? 'Item'}`).join(' · ')}
          </Text>
        )}

        {/* Progress */}
        {isActive && progress > 0 && (
          <View style={{ marginTop: 14 }}>
            <View style={{ height: 4, backgroundColor: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ height: 4, backgroundColor: cfg.dot, borderRadius: 2, width: `${progress * 100}%` }} />
            </View>
            <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Step {stepIdx + 1} of {STATUS_STEPS.length}</Text>
          </View>
        )}

        {/* ETA */}
        {order.status === 'out_for_delivery' && (
          <View style={{ marginTop: 12, backgroundColor: '#f0fdfa', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 18 }}>🛵</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f766e', flex: 1 }}>
              {etaTime ? `Arriving around ${etaTime}` : 'Courier is on the way'}
            </Text>
          </View>
        )}

        {order.status === 'delivered' && (
          <View style={{ marginTop: 12, backgroundColor: '#f0fdf4', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 18 }}>✅</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#15803d' }}>Delivered — enjoy your meal!</Text>
          </View>
        )}
      </View>
    </View>
  )
}
