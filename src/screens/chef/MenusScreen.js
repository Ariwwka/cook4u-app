import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

function MenuCard({ menu }) {
  const itemCount = menu.menu_items?.length ?? 0

  return (
    <View style={styles.menuCard}>
      <View style={styles.menuCardTop}>
        <View style={styles.menuIcon}>
          <Ionicons name="restaurant-outline" size={22} color="#F97316" />
        </View>
        <View style={styles.menuInfo}>
          <Text style={styles.menuName}>{menu.name}</Text>
          <Text style={styles.menuItemCount}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={[styles.statusDot, menu.is_active ? styles.statusDotActive : styles.statusDotInactive]} />
      </View>
      {menu.description ? (
        <Text style={styles.menuDescription} numberOfLines={2}>{menu.description}</Text>
      ) : null}
    </View>
  )
}

export default function MenusScreen() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMenus = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('menus')
        .select('*, menu_items(id)')
        .eq('chef_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching menus:', error)
      } else {
        setMenus(data || [])
      }
    } catch (err) {
      console.error('fetchMenus exception:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchMenus()
  }, [fetchMenus])

  function handleOpenWeb() {
    Linking.openURL('https://cook4u.london')
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Menus</Text>
      </View>

      <View style={styles.webBanner}>
        <Ionicons name="globe-outline" size={16} color="#6B7280" style={styles.webBannerIcon} />
        <Text style={styles.webBannerText}>
          Manage menus in full on{' '}
          <Text style={styles.webBannerLink} onPress={handleOpenWeb}>
            cook4u.london
          </Text>
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#F97316" size="large" />
        </View>
      ) : (
        <FlatList
          data={menus}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MenuCard menu={item} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyText}>No menus yet</Text>
              <Text style={styles.emptySubText}>
                Create and manage your menus at cook4u.london
              </Text>
              <TouchableOpacity
                style={styles.openWebButton}
                onPress={handleOpenWeb}
                activeOpacity={0.7}
              >
                <Text style={styles.openWebButtonText}>Go to cook4u.london</Text>
              </TouchableOpacity>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  webBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  webBannerIcon: {
    marginRight: 8,
  },
  webBannerText: {
    fontSize: 13,
    color: '#6B7280',
  },
  webBannerLink: {
    color: '#F97316',
    fontWeight: '600',
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
  menuCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  menuCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuInfo: {
    flex: 1,
  },
  menuName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  menuItemCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotActive: {
    backgroundColor: '#16A34A',
  },
  statusDotInactive: {
    backgroundColor: '#9CA3AF',
  },
  menuDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    lineHeight: 18,
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: 'center',
    paddingHorizontal: 20,
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
    marginBottom: 24,
  },
  openWebButton: {
    height: 44,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openWebButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
})
