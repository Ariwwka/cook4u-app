import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const STATUS_COLORS = {
  pending: { bg: '#FFF7ED', text: '#F97316' },
  confirmed: { bg: '#EFF6FF', text: '#3B82F6' },
  preparing: { bg: '#FFFBEB', text: '#D97706' },
  ready: { bg: '#F0FDF4', text: '#16A34A' },
  delivered: { bg: '#F0FDF4', text: '#16A34A' },
  cancelled: { bg: '#FEF2F2', text: '#EF4444' },
}

function OrderCard({ order }) {
  const statusInfo = STATUS_COLORS[order.status] ?? { bg: '#F3F4F6', text: '#6B7280' }
  const customerName = order.profiles?.full_name ?? 'Customer'
  const createdAt = new Date(order.created_at)
  const timeAgo = getTimeAgo(createdAt)

  function getTimeAgo(date) {
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderCardTop}>
        <Text style={styles.customerName}>{customerName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
          <Text style={[styles.statusText, { color: statusInfo.text }]}>
            {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
          </Text>
        </View>
      </View>
      {order.items_summary ? (
        <Text style={styles.itemsSummary} numberOfLines={2}>{order.items_summary}</Text>
      ) : null}
      <View style={styles.orderCardBottom}>
        <Text style={styles.orderTime}>{timeAgo}</Text>
        <Text style={styles.orderTotal}>£{Number(order.total ?? 0).toFixed(2)}</Text>
      </View>
    </View>
  )
}

export default function ChefOrdersScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [newOrderCount, setNewOrderCount] = useState(0)

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, profiles:customer_id(full_name)')
        .eq('chef_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching chef orders:', error)
      } else {
        const orderList = data || []
        setOrders(orderList)
        setNewOrderCount(orderList.filter((o) => o.status === 'pending').length)
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
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Orders</Text>
          {newOrderCount > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{newOrderCount}</Text>
            </View>
          )}
        </View>
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
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text style={styles.emptyText}>No orders yet</Text>
              <Text style={styles.emptySubText}>
                Orders from customers will appear here
              </Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  badgeCount: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeCountText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
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
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemsSummary: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 18,
  },
  orderCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderTime: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  orderTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
})
