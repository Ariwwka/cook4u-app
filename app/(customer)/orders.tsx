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
  ready: 'Ready',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_COLOR: Record<string, string> = {
  payment_pending: 'text-gray-400',
  pending_acceptance: 'text-yellow-500',
  confirmed: 'text-blue-500',
  preparing: 'text-blue-500',
  ready: 'text-indigo-500',
  out_for_delivery: 'text-teal-500',
  delivered: 'text-green-500',
  cancelled: 'text-red-400',
}

const STATUS_STEPS = ['pending_acceptance', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']

function ProgressBar({ status }: { status: string }) {
  const idx = STATUS_STEPS.indexOf(status)
  if (idx < 0) return null
  const pct = Math.round(((idx + 1) / STATUS_STEPS.length) * 100)
  return (
    <View className="mt-3">
      <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <View className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
      </View>
      <Text className="text-xs text-gray-400 mt-1">{STATUS_LABEL[status] ?? status}</Text>
    </View>
  )
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
      .limit(20)
    setOrders((data as unknown as Order[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Real-time subscription for order status updates
  useEffect(() => {
    const channel = supabase
      .channel('customer_orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders])

  if (loading) return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator color="#f97316" size="large" /></View>

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-800">My Orders</Text>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders() }} tintColor="#f97316" />}
      >
        {orders.length === 0 ? (
          <View className="items-center py-20">
            <Text className="text-5xl mb-3">📦</Text>
            <Text className="text-gray-500 text-base">No orders yet</Text>
          </View>
        ) : (
          <View className="gap-3 mt-2">
            {orders.map(order => {
              const chefName = (order.chef as any)?.profile?.full_name ?? 'Chef'
              const date = new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              const eta = order.gophr_delivery_eta ? new Date(order.gophr_delivery_eta) : null
              const etaTime = eta ? eta.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null
              const statusColor = STATUS_COLOR[order.status] ?? 'text-gray-500'

              return (
                <View key={order.id} className="bg-white rounded-2xl p-4 border border-orange-50">
                  <View className="flex-row justify-between items-start">
                    <View>
                      <Text className="font-bold text-gray-800 text-base">{chefName}</Text>
                      <Text className="text-gray-400 text-xs mt-0.5">{date} · £{Number(order.total).toFixed(2)}</Text>
                    </View>
                    <Text className={`text-sm font-semibold ${statusColor}`}>{STATUS_LABEL[order.status] ?? order.status}</Text>
                  </View>

                  {/* Items summary */}
                  {order.order_items && order.order_items.length > 0 && (
                    <Text className="text-gray-400 text-xs mt-2" numberOfLines={1}>
                      {order.order_items.map((oi: any) => `${oi.quantity}× ${oi.menu_item?.name ?? 'Item'}`).join(', ')}
                    </Text>
                  )}

                  {/* Progress bar for active orders */}
                  {!['payment_pending', 'cancelled', 'delivered'].includes(order.status) && (
                    <ProgressBar status={order.status} />
                  )}

                  {/* ETA banner */}
                  {order.status === 'out_for_delivery' && (
                    <View className="mt-3 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2 flex-row items-center gap-2">
                      <Text>🛵</Text>
                      <Text className="text-teal-700 text-sm font-medium flex-1">
                        {etaTime ? `Arriving around ${etaTime}` : 'Courier is on the way'}
                      </Text>
                    </View>
                  )}

                  {order.status === 'delivered' && (
                    <View className="mt-3 bg-green-50 border border-green-100 rounded-xl px-3 py-2 flex-row items-center gap-2">
                      <Text>✅</Text>
                      <Text className="text-green-700 text-sm font-medium">Delivered!</Text>
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
