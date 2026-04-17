import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import type { Order } from '@/types'

type OrderStatus = 'pending_acceptance' | 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'

const NEXT_STATUS: Record<string, { label: string; next: OrderStatus }> = {
  pending_acceptance: { label: 'Accept Order', next: 'confirmed' },
  confirmed: { label: 'Start Preparing', next: 'preparing' },
  preparing: { label: 'Mark Ready', next: 'ready' },
  ready: { label: 'Book Courier & Dispatch', next: 'out_for_delivery' },
}

const STATUS_LABEL: Record<string, string> = {
  pending_acceptance: 'New',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_BG: Record<string, string> = {
  pending_acceptance: 'bg-yellow-50 border-yellow-200',
  confirmed: 'bg-blue-50 border-blue-100',
  preparing: 'bg-indigo-50 border-indigo-100',
  ready: 'bg-purple-50 border-purple-100',
  out_for_delivery: 'bg-teal-50 border-teal-100',
  delivered: 'bg-green-50 border-green-100',
  cancelled: 'bg-gray-50 border-gray-200',
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
      .not('status', 'in', '("delivered","cancelled")')
      .order('created_at', { ascending: true })
    setOrders((data as unknown as Order[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    const channel = supabase
      .channel('chef_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  async function advanceStatus(order: Order) {
    const next = NEXT_STATUS[order.status]
    if (!next) return

    if (next.next === 'out_for_delivery') {
      Alert.alert('Book Courier', `This will dispatch a Gophr courier for order #${order.id.slice(-6).toUpperCase()}. Continue?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Book & Dispatch', style: 'default', onPress: () => doAdvance(order, next.next) },
      ])
    } else {
      doAdvance(order, next.next)
    }
  }

  async function doAdvance(order: Order, next: OrderStatus) {
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
      if (!res.ok) {
        Alert.alert('Error', json.error ?? 'Failed to update order')
        return
      }
      await fetchOrders()
    } catch {
      Alert.alert('Error', 'Network error — please retry')
    } finally {
      setActionLoading(null)
    }
  }

  async function declineOrder(orderId: string) {
    Alert.alert('Decline order?', 'The customer will be refunded.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: async () => {
        setActionLoading(orderId)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/mobile/chef/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ status: 'cancelled' }),
        })
        setActionLoading(null)
        fetchOrders()
      }},
    ])
  }

  if (loading) return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator color="#f97316" size="large" /></View>

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-800">Active Orders</Text>
        {orders.length > 0 && <Text className="text-gray-400 text-sm mt-0.5">{orders.length} order{orders.length !== 1 ? 's' : ''}</Text>}
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders() }} tintColor="#f97316" />}
      >
        {orders.length === 0 ? (
          <View className="items-center py-20">
            <Text className="text-5xl mb-3">📋</Text>
            <Text className="text-gray-500 text-base">No active orders</Text>
          </View>
        ) : (
          <View className="gap-3 mt-2">
            {orders.map(order => {
              const next = NEXT_STATUS[order.status]
              const isLoading = actionLoading === order.id
              const bgClass = STATUS_BG[order.status] ?? 'bg-white border-gray-100'
              const customerName = (order.customer as any)?.full_name ?? 'Customer'
              const time = new Date(order.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

              return (
                <View key={order.id} className={`rounded-2xl p-4 border ${bgClass}`}>
                  <View className="flex-row justify-between items-start">
                    <View>
                      <Text className="font-bold text-gray-800">#{order.id.slice(-6).toUpperCase()}</Text>
                      <Text className="text-gray-400 text-xs mt-0.5">{customerName} · {time}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-bold text-gray-800">£{Number(order.total).toFixed(2)}</Text>
                      <Text className="text-xs text-orange-500 font-medium mt-0.5">{STATUS_LABEL[order.status]}</Text>
                    </View>
                  </View>

                  {/* Items */}
                  {order.order_items && (
                    <View className="mt-2 gap-0.5">
                      {order.order_items.map((oi: any) => (
                        <Text key={oi.id} className="text-gray-600 text-sm">
                          {oi.quantity}× {oi.menu_item?.name ?? 'Item'}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Address */}
                  {order.delivery_address_text && (
                    <Text className="text-gray-400 text-xs mt-2" numberOfLines={1}>📍 {order.delivery_address_text}</Text>
                  )}

                  {/* Actions */}
                  {next && (
                    <View className="mt-3 flex-row gap-2">
                      {order.status === 'pending_acceptance' && (
                        <TouchableOpacity onPress={() => declineOrder(order.id)} className="flex-1 py-2.5 rounded-xl border border-red-200 items-center bg-white">
                          <Text className="text-red-500 font-semibold text-sm">Decline</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        onPress={() => advanceStatus(order)}
                        disabled={isLoading}
                        className="flex-1 py-2.5 rounded-xl bg-orange-500 items-center"
                      >
                        {isLoading ? <ActivityIndicator color="white" size="small" /> : (
                          <Text className="text-white font-semibold text-sm">{next.label}</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
