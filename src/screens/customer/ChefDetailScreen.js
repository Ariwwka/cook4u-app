import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { supabase } from '../../lib/supabase'

export default function ChefDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets()
  const { chefId } = route.params
  const { user } = useAuth()
  const { addItem, removeItem, clearCart, items, itemCount } = useCart()

  const [chef, setChef] = useState(null)
  const [chefProfile, setChefProfile] = useState(null)
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)
  const [bioExpanded, setBioExpanded] = useState(false)
  const [isFavourite, setIsFavourite] = useState(false)
  const [togglingFav, setTogglingFav] = useState(false)

  useEffect(() => {
    fetchChefData()
  }, [chefId])

  useEffect(() => {
    if (user?.id) checkFavourite()
  }, [chefId, user?.id])

  async function fetchChefData() {
    setLoading(true)
    try {
      const [profileRes, chefProfileRes, menusRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', chefId).single(),
        supabase.from('chef_profiles').select('*').eq('id', chefId).single(),
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

  async function checkFavourite() {
    const { data } = await supabase
      .from('chef_favorites')
      .select('id')
      .eq('customer_id', user.id)
      .eq('chef_id', chefId)
      .maybeSingle()
    setIsFavourite(!!data)
  }

  async function toggleFavourite() {
    if (!user?.id) return
    setTogglingFav(true)
    try {
      if (isFavourite) {
        await supabase
          .from('chef_favorites')
          .delete()
          .eq('customer_id', user.id)
          .eq('chef_id', chefId)
        setIsFavourite(false)
      } else {
        await supabase
          .from('chef_favorites')
          .insert({ customer_id: user.id, chef_id: chefId })
        setIsFavourite(true)
      }
    } catch {}
    finally { setTogglingFav(false) }
  }

  function handleAddItem(menuItem) {
    const chefName = chef?.full_name ?? 'Chef'
    const result = addItem(menuItem, chefId, chefName)
    if (result.conflict) {
      Alert.alert(
        'Different Chef',
        `Your cart has items from ${result.existingChefName}. Clear the cart to order from ${chefName}?`,
        [
          { text: 'Keep Cart', style: 'cancel' },
          {
            text: 'Clear & Add',
            style: 'destructive',
            onPress: () => {
              clearCart()
              addItem(menuItem, chefId, chefName)
            },
          },
        ]
      )
    }
  }

  function getItemQty(menuItemId) {
    const found = items.find((i) => i.menuItemId === menuItemId)
    return found?.quantity ?? 0
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
  const rating = chefProfile?.rating
  const reviewCount = chefProfile?.review_count ?? 0
  const bio = chefProfile?.bio ?? ''
  const avatarUrl = chef?.avatar_url ?? null

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
        <TouchableOpacity
          style={styles.heartButton}
          onPress={toggleFavourite}
          disabled={togglingFav}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isFavourite ? 'heart' : 'heart-outline'}
            size={24}
            color={isFavourite ? '#EF4444' : '#9CA3AF'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + (itemCount > 0 ? 100 : 24) }]}
      >
        <View style={styles.profileSection}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
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
            <Text style={styles.emptyMenuText}>No menus available yet</Text>
          </View>
        ) : (
          menus.map((menu) => (
            <View key={menu.id} style={styles.menuSection}>
              <Text style={styles.menuSectionTitle}>{menu.name}</Text>
              {(menu.menu_items ?? []).map((item) => {
                const qty = getItemQty(item.id)
                return (
                  <View key={item.id} style={styles.menuItemCard}>
                    <View style={styles.menuItemLeft}>
                      <View style={styles.menuItemInfo}>
                        <Text style={styles.menuItemName}>{item.name}</Text>
                        {item.description ? (
                          <Text style={styles.menuItemDesc} numberOfLines={2}>
                            {item.description}
                          </Text>
                        ) : null}
                        {item.dietary_tags?.length > 0 && (
                          <View style={styles.tagsRow}>
                            {item.dietary_tags.map((tag) => (
                              <View key={tag} style={styles.dietaryTag}>
                                <Text style={styles.dietaryTagText}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.menuItemRight}>
                      <Text style={styles.menuItemPrice}>
                        £{Number(item.price ?? 0).toFixed(2)}
                      </Text>
                      {qty > 0 ? (
                        <View style={styles.qtyControls}>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => removeItem(item.id)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="remove" size={16} color="#F97316" />
                          </TouchableOpacity>
                          <Text style={styles.qtyText}>{qty}</Text>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => handleAddItem(item)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="add" size={16} color="#F97316" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => handleAddItem(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )
              })}
            </View>
          ))
        )}
      </ScrollView>

      {itemCount > 0 && (
        <View style={[styles.cartBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.cartBarButton}
            onPress={() => navigation.navigate('CartTab')}
            activeOpacity={0.85}
          >
            <View style={styles.cartBarBadge}>
              <Text style={styles.cartBarBadgeText}>{itemCount}</Text>
            </View>
            <Text style={styles.cartBarText}>View Cart</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
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
  backButton: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  heartButton: { width: 36, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  profileSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F97316',
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFF7ED',
    borderWidth: 2,
    borderColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#F97316' },
  chefName: { fontSize: 22, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 8 },
  cuisineChip: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 8,
  },
  cuisineChipText: { fontSize: 13, fontWeight: '600', color: '#F97316' },
  locationText: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  ratingText: { fontSize: 14, color: '#F97316', fontWeight: '600', marginBottom: 8 },
  bioContainer: { marginTop: 8, width: '100%' },
  bioText: { fontSize: 14, color: '#6B7280', lineHeight: 20, textAlign: 'center' },
  readMore: { fontSize: 14, color: '#F97316', fontWeight: '600', textAlign: 'center', marginTop: 4 },
  menuSection: { marginTop: 16 },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemLeft: { flex: 1, marginRight: 12 },
  menuItemInfo: { flex: 1 },
  menuItemName: { fontSize: 14, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 3 },
  menuItemDesc: { fontSize: 12, color: '#6B7280', lineHeight: 16 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  dietaryTag: {
    backgroundColor: '#F0FDF4',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dietaryTagText: { fontSize: 10, color: '#16A34A', fontWeight: '600' },
  menuItemRight: { alignItems: 'flex-end', gap: 8 },
  menuItemPrice: { fontSize: 15, fontWeight: 'bold', color: '#F97316' },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { fontSize: 14, fontWeight: 'bold', color: '#1C1C1E', minWidth: 16, textAlign: 'center' },
  emptyMenuContainer: { paddingTop: 48, alignItems: 'center' },
  emptyMenuEmoji: { fontSize: 48, marginBottom: 16 },
  emptyMenuText: { fontSize: 16, color: '#6B7280' },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cartBarButton: {
    height: 52,
    backgroundColor: '#F97316',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  cartBarBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBarBadgeText: { fontSize: 13, fontWeight: 'bold', color: '#FFFFFF' },
  cartBarText: { flex: 1, fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
})
