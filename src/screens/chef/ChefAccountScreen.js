import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'

const VERIFICATION_STATUS_INFO = {
  unsubmitted: { label: 'Not Submitted', bg: '#FFF7ED', text: '#C2410C' },
  pending: { label: 'Under Review', bg: '#FFFBEB', text: '#92400E' },
  verified: { label: 'Verified', bg: '#F0FDF4', text: '#15803D' },
  rejected: { label: 'Rejected', bg: '#FEF2F2', text: '#B91C1C' },
}

const MENU_ITEMS = [
  { icon: '👤', label: 'Personal Info', key: 'personal' },
  { icon: '🍽️', label: 'Manage Profile at cook4u.london', key: 'webprofile' },
  { icon: '❓', label: 'Help & Support', key: 'help' },
  { icon: '📄', label: 'Terms of Service', key: 'terms' },
]

function MenuRow({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.menuRowIcon}>{icon}</Text>
      <Text style={styles.menuRowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  )
}

export default function ChefAccountScreen() {
  const insets = useSafeAreaInsets()
  const { user, profile, signOut } = useAuth()

  const fullName = profile?.full_name ?? user?.user_metadata?.full_name ?? 'Chef'
  const email = user?.email ?? ''
  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const verificationStatus = profile?.verification_status ?? 'unsubmitted'
  const statusInfo =
    VERIFICATION_STATUS_INFO[verificationStatus] ?? VERIFICATION_STATUS_INFO.unsubmitted

  function handleMenuPress(key) {
    if (key === 'webprofile') {
      Linking.openURL('https://cook4u.london')
    }
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ])
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{fullName}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
          <View style={[styles.verificationBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.verificationBadgeText, { color: statusInfo.text }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          {MENU_ITEMS.map((item) => (
            <MenuRow
              key={item.key}
              icon={item.icon}
              label={item.label}
              onPress={() => handleMenuPress(item.key)}
            />
          ))}
        </View>

        <View style={styles.divider} />

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
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
  scrollContent: {
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#F97316',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  verificationBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  verificationBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  menuSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuRowIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  menuRowLabel: {
    flex: 1,
    fontSize: 16,
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
