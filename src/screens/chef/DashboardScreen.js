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
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const VERIFICATION_BANNERS = {
  unsubmitted: {
    bg: '#FFF7ED',
    border: '#F97316',
    text: '#C2410C',
    message: 'Complete verification to go live',
    icon: '⚠️',
  },
  pending: {
    bg: '#FFFBEB',
    border: '#D97706',
    text: '#92400E',
    message: 'Documents under review',
    icon: '⏳',
  },
  verified: {
    bg: '#F0FDF4',
    border: '#16A34A',
    text: '#15803D',
    message: '✓ Verified chef',
    icon: '✅',
  },
  rejected: {
    bg: '#FEF2F2',
    border: '#EF4444',
    text: '#B91C1C',
    message: 'Documents rejected — please resubmit',
    icon: '❌',
  },
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { user, profile, signOut } = useAuth()
  const [chefProfile, setChefProfile] = useState(null)
  const [stats, setStats] = useState({ totalOrders: 0, rating: null, memberSince: '' })
  const [loading, setLoading] = useState(true)
  const [togglingAvailability, setTogglingAvailability] = useState(false)

  const fullName = profile?.full_name ?? user?.user_metadata?.full_name ?? 'Chef'

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const [chefProfileRes, ordersRes] = await Promise.all([
        supabase.from('chef_profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('orders')
          .select('id', { count: 'exact' })
          .eq('chef_id', user.id),
      ])

      if (chefProfileRes.data) {
        setChefProfile(chefProfileRes.data)
      }

      const totalOrders = ordersRes.count ?? 0
      const rating = chefProfileRes.data?.average_rating ?? null
      const createdAt = profile?.created_at ?? user?.created_at
      const memberSince = createdAt
        ? new Date(createdAt).toLocaleDateString('en-GB', {
            month: 'short',
            year: 'numeric',
          })
        : 'N/A'

      setStats({ totalOrders, rating, memberSince })
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
      if (!error && data) {
        setChefProfile(data)
      }
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>{fullName}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#F97316" size="large" />
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard label="Total Orders" value={String(stats.totalOrders)} />
              <StatCard
                label="Rating"
                value={stats.rating ? `⭐ ${Number(stats.rating).toFixed(1)}` : 'N/A'}
              />
              <StatCard label="Member Since" value={stats.memberSince} />
            </View>

            <View style={[styles.banner, { backgroundColor: bannerInfo.bg, borderColor: bannerInfo.border }]}>
              <Text style={[styles.bannerText, { color: bannerInfo.text }]}>
                {bannerInfo.icon} {bannerInfo.message}
              </Text>
            </View>

            <View style={styles.availabilityRow}>
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

            <Text style={styles.sectionLabel}>Quick Links</Text>

            <TouchableOpacity
              style={styles.quickLinkRow}
              onPress={() => navigation.navigate('MenusTab')}
              activeOpacity={0.7}
            >
              <Text style={styles.quickLinkText}>My Menus</Text>
              <Ionicons name="chevron-forward" size={18} color="#F97316" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLinkRow}
              onPress={() => navigation.navigate('ChefOrdersTab')}
              activeOpacity={0.7}
            >
              <Text style={styles.quickLinkText}>View Orders</Text>
              <Ionicons name="chevron-forward" size={18} color="#F97316" />
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  banner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  bannerText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  availabilityLeft: {
    flex: 1,
    marginRight: 12,
  },
  availabilityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  availabilitySubLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  quickLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  quickLinkText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 24,
  },
  signOutButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
})
