import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'

export default function ChefDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets()
  const { chefId } = route.params
  const [chef, setChef] = useState(null)
  const [chefProfile, setChefProfile] = useState(null)
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [bioExpanded, setBioExpanded] = useState(false)

  useEffect(() => {
    fetchChefData()
  }, [chefId])

  async function fetchChefData() {
    setLoading(true)
    try {
      const [profileRes, chefProfileRes, menusRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', chefId).single(),
        supabase.from('chef_profiles').select('*').eq('user_id', chefId).single(),
        supabase
          .from('menus')
          .select('*, menu_items(*)')
          .eq('chef_id', chefId)
          .eq('is_active', true),
      ])

      if (profileRes.data) setChef(profileRes.data)
      if (chefProfileRes.data) setChefProfile(chefProfileRes.data)
      if (menusRes.data) setMenus(menusRes.data)
    } catch (err) {
      console.error('fetchChefData exception:', err)
    } finally {
      setLoading(false)
    }
  }

  function handleAddItem(item) {
    Alert.alert('Added to cart!', `${item.name} has been added to your cart.`)
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#F97316" size="large" />
      </View>
    )
  }

  const chefName = chef?.full_name ?? 'Chef'
  const initials = chefName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const cuisine = chefProfile?.cuisine_tags?.[0] ?? 'Various'
  const location = chefProfile?.location ?? ''
  const rating = chefProfile?.average_rating
  const reviewCount = chefProfile?.review_count ?? 0
  const bio = chefProfile?.bio ?? ''

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.stickyHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{chefName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.chefName}>{chefName}</Text>
          <View style={styles.cuisineChip}>
            <Text style={styles.cuisineChipText}>{cuisine}</Text>
          </View>
          {location ? (
            <Text style={styles.locationText}>📍 {location}</Text>
          ) : null}
          {rating ? (
            <Text style={styles.ratingText}>
              ⭐ {Number(rating).toFixed(1)}{reviewCount > 0 ? ` (${reviewCount} reviews)` : ''}
            </Text>
          ) : null}
          {bio ? (
            <View style={styles.bioContainer}>
              <Text
                style={styles.bioText}
                numberOfLines={bioExpanded ? undefined : 3}
              >
                {bio}
              </Text>
              {bio.length > 120 && (
                <TouchableOpacity
                  onPress={() => setBioExpanded(!bioExpanded)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.readMore}>
                    {bioExpanded ? 'Show less' : 'Read more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>

        {menus.length === 0 ? (
          <View style={styles.emptyMenuContainer}>
            <Text style={styles.emptyMenuEmoji}>🍽️</Text>
            <Text style={styles.emptyMenuText}>No menus available</Text>
          </View>
        ) : (
          menus.map((menu) => (
            <View key={menu.id} style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>{menu.name}</Text>
              {(menu.menu_items ?? []).map((item) => (
                <View key={item.id} style={styles.menuItemCard}>
                  <View style={styles.menuItemLeft}>
                    <Text style={styles.menuItemEmoji}>🍽️</Text>
                    <View style={styles.menuItemInfo}>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      {item.description ? (
                        <Text style={styles.menuItemDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.menuItemRight}>
                    <Text style={styles.menuItemPrice}>
                      £{Number(item.price ?? 0).toFixed(2)}
                    </Text>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => handleAddItem(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  stickyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 36,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
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
  chefName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  cuisineChip: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 8,
  },
  cuisineChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F97316',
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
    marginBottom: 8,
  },
  bioContainer: {
    marginTop: 8,
    width: '100%',
  },
  bioText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
  },
  readMore: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  menuSection: {
    marginTop: 16,
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  menuItemEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 3,
  },
  menuItemDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  menuItemRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  menuItemPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F97316',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMenuContainer: {
    paddingTop: 48,
    alignItems: 'center',
  },
  emptyMenuEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyMenuText: {
    fontSize: 16,
    color: '#6B7280',
  },
})
