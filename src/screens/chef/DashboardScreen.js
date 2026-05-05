import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const VERIFICATION_BANNERS = {
  unsubmitted: {
    bg: '#FFF7ED', border: '#F97316', text: '#C2410C',
    message: 'Complete your verification to go live',
    icon: 'alert-circle-outline',
  },
  pending: {
    bg: '#FFFBEB', border: '#D97706', text: '#92400E',
    message: 'Your documents are under review',
    icon: 'time-outline',
  },
  verified: {
    bg: '#F0FDF4', border: '#16A34A', text: '#15803D',
    message: 'Your profile is verified',
    icon: 'checkmark-circle-outline',
  },
  rejected: {
    bg: '#FEF2F2', border: '#EF4444', text: '#B91C1C',
    message: 'Documents rejected — please resubmit',
    icon: 'close-circle-outline',
  },
}

function greeting() {
  const hr = new Date().getHours()
  if (hr < 12) return 'Good morning'
  if (hr < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { user, profile, signOut } = useAuth()
  const [chefProfile, setChefProfile] = useState(null)
  const [stats, setStats] = useState({ totalOrders: 0, newOrders: 0, rating: null, memberSince: '' })
  const [loading, setLoading] = useState(true)
  const [togglingAvailability, setTogglingAvailability] = useState(false)

  const firstName = profile?.first_name ?? (profile?.full_name ?? 'Chef').split(' ')[0]

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [chefProfileRes, ordersRes] = await Promise.all([
        supabase.from('chef_profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('orders')
          .select('id, status', { count: 'exact' })
          .eq('chef_id', user.id)
          .not('status', 'in', '("payment_pending","payment_failed")'),
      ])

      if (chefProfileRes.data) setChefProfile(chefProfileRes.data)

      const allOrders = ordersRes.data || []
      const totalOrders = ordersRes.count ?? allOrders.length
      const newOrders = allOrders.filter((o) => o.status === 'pending_acceptance').length
      const rating = chefProfileRes.data?.rating ?? null
      const createdAt = profile?.created_at ?? user?.created_at
      const memberSince = createdAt
        ? new Date(createdAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
        : ''

      setStats({ totalOrders, newOrders, rating, memberSince })
    } catch (err) {
      console.error('fetchDashboardData exception:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id, profile])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  async function handleToggleAvailability(value) {
    if (!chefProfile?.id) return
    if (chefProfile.verification_status !== 'verified') {
      Alert.alert('Not Verified', 'You must be verified before accepting orders.')
      return
    }
    setTogglingAvailability(true)
    try {
      const { data, error } = await supabase
        .from('chef_profiles')
        .update({ is_available: value })
        .eq('id', chefProfile.id)
        .select()
        .single()
      if (!error && data) setChefProfile(data)
    } catch (err) {
      console.error('toggleAvailability exception:', err)
    } finally {
      setTogglingAvailability(false)
    }
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ])
  }

  const verificationStatus = chefProfile?.verification_status ?? 'unsubmitted'
  const bannerInfo = VERIFICATION_BANNERS[verificationStatus] ?? VERIFICATION_BANNERS.unsubmitted
  const isAvailable = chefProfile?.is_available ?? false
  const isVerified = verificationStatus === 'verified'

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#EA580C', '#F97316']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientHeader, { paddingTop: insets.top + 20 }]}
      >
        <Text style={styles.greetingText}>{greeting()},</Text>
        <Text style={styles.chefNameText}>{firstName} 👨‍🍳</Text>

        {stats.newOrders > 0 && (
          <TouchableOpacity
            style={styles.newOrderAlert}
            onPress={() => navigation.navigate('ChefOrdersTab')}
            activeOpacity={0.85}
          >
            <View style={styles.newOrderDot} />
            <Text style={styles.newOrderAlertText}>
              {stats.newOrders} new order{stats.newOrders !== 1 ? 's' : ''} waiting
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{String(stats.totalOrders)}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats.rating ? `⭐ ${Number(stats.rating).toFixed(1)}` : '—'}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.memberSince || '—'}</Text>
            <Text style={styles.statLabel}>Member Since</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#F97316" size="large" />
          </View>
        ) : (
          <>
            <View style={[styles.banner, { backgroundColor: bannerInfo.bg, borderColor: bannerInfo.border }]}>
              <Ionicons name={bannerInfo.icon} size={20} color={bannerInfo.text} />
              <Text style={[styles.bannerText, { color: bannerInfo.text }]}>
                {bannerInfo.message}
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.availabilityLeft}>
                <Text style={styles.availabilityLabel}>Accepting Orders</Text>
                <Text style={styles.availabilitySubLabel}>
                  {isVerified ? 'Toggle to accept or pause orders' : 'Available after verification'}
                </Text>
              </View>
              {togglingAvailability ? (
                <ActivityIndicator color="#F97316" />
              ) : (
                <Switch
                  value={isAvailable}
                  onValueChange={handleToggleAvailability}
                  trackColor={{ false: '#E5E7EB', true: '#FDBA74' }}
                  thumbColor={isAvailable ? '#F97316' : '#9CA3AF'}
                  disabled={!isVerified}
                />
              )}
            </View>

            <Text style={styles.sectionLabel}>Quick Actions</Text>

            <TouchableOpacity
              style={styles.quickLinkRow}
              onPress={() => navigation.navigate('MenusTab')}
              activeOpacity={0.7}
            >
              <View style={styles.quickLinkIcon}>
                <Ionicons name="restaurant-outline" size={20} color="#F97316" />
              </View>
              <Text style={styles.quickLinkText}>My Menus</Text>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkRow}
              onPress={() => navigation.navigate('ChefOrdersTab')}
              activeOpacity={0.7}
            >
              <View style={styles.quickLinkIcon}>
                <Ionicons name="receipt-outline" size={20} color="#F97316" />
              </View>
              <Text style={styles.quickLinkText}>View Orders</Text>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkRow}
              onPress={() => navigation.navigate('ChefAccountTab')}
              activeOpacity={0.7}
            >
              <View style={styles.quickLinkIcon}>
                <Ionicons name="person-outline" size={20} color="#F97316" />
              </View>
              <Text style={styles.quickLinkText}>My Account</Text>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
              activeOpacity={0.7}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  gradientHeader: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  greetingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginBottom: 2,
  },
  chefNameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  newOrderAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
    gap: 8,
  },
  newOrderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  newOrderAlertText: { flex: 1, fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 3 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 8 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },
  loadingContainer: { paddingTop: 40, alignItems: 'center' },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  bannerText: { flex: 1, fontSize: 14, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  availabilityLeft: { flex: 1, marginRight: 12 },
  availabilityLabel: { fontSize: 16, fontWeight: '600', color: '#1C1C1E', marginBottom: 2 },
  availabilitySubLabel: { fontSize: 12, color: '#6B7280' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  quickLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  quickLinkIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickLinkText: { flex: 1, fontSize: 16, fontWeight: '500', color: '#1C1C1E' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 24 },
  signOutButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
})
