import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const { width } = Dimensions.get('window')
const CARD_GAP = 12
const CARD_WIDTH = (width - 40 - CARD_GAP) / 2

const CUISINES = [
  'All', 'African', 'Indian', 'Chinese', 'Italian',
  'Middle Eastern', 'British', 'Japanese', 'Thai', 'Korean', 'Mexican',
]

function ChefCard({ chef, onPress }) {
  const initials = chef.full_name
    ? chef.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const isAvailable = chef.chef_profiles?.[0]?.is_available ?? false
  const rating = chef.chef_profiles?.[0]?.average_rating ?? null
  const cuisine = chef.chef_profiles?.[0]?.cuisine_tags?.[0] ?? 'Various'

  return (
    <TouchableOpacity
      style={styles.chefCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.chefAvatar}>
        <Text style={styles.chefAvatarText}>{initials}</Text>
      </View>
      <Text style={styles.chefName} numberOfLines={1}>{chef.full_name || 'Chef'}</Text>
      <Text style={styles.chefCuisine} numberOfLines={1}>{cuisine}</Text>
      <View style={styles.chefMeta}>
        {rating ? (
          <Text style={styles.ratingText}>⭐ {Number(rating).toFixed(1)}</Text>
        ) : null}
        <View style={[styles.badge, isAvailable ? styles.badgeAvailable : styles.badgeUnavailable]}>
          <Text style={[styles.badgeText, isAvailable ? styles.badgeTextAvailable : styles.badgeTextUnavailable]}>
            {isAvailable ? 'Available' : 'Unavailable'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function BrowseScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { profile } = useAuth()
  const [chefs, setChefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCuisine, setSelectedCuisine] = useState('All')

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const fetchChefs = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, chef_profiles(cuisine_tags, average_rating, is_available, bio)')
        .eq('role', 'chef')
        .eq('chef_profiles.verification_status', 'verified')

      const { data, error } = await query
      if (error) {
        console.error('Error fetching chefs:', error)
      } else {
        setChefs(data || [])
      }
    } catch (err) {
      console.error('fetchChefs exception:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChefs()
  }, [fetchChefs])

  const filteredChefs = chefs.filter((chef) => {
    const cuisineTags = chef.chef_profiles?.[0]?.cuisine_tags ?? []
    const name = (chef.full_name ?? '').toLowerCase()
    const query = searchQuery.toLowerCase()

    const matchesSearch =
      !searchQuery ||
      name.includes(query) ||
      cuisineTags.some((t) => t.toLowerCase().includes(query))

    const matchesCuisine =
      selectedCuisine === 'All' ||
      cuisineTags.some((t) =>
        t.toLowerCase().includes(selectedCuisine.toLowerCase())
      )

    return matchesSearch && matchesCuisine
  })

  function renderChefCard({ item, index }) {
    return (
      <View style={index % 2 === 0 ? { marginRight: CARD_GAP / 2 } : { marginLeft: CARD_GAP / 2 }}>
        <ChefCard
          chef={item}
          onPress={() => navigation.navigate('ChefDetail', { chefId: item.id })}
        />
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>Cook4U</Text>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chefs or cuisines..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredChefs}
        keyExtractor={(item) => item.id}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={renderChefCard}
        ListHeaderComponent={
          <>
            <FlatList
              data={CUISINES}
              keyExtractor={(item) => item}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.chip,
                    selectedCuisine === item && styles.chipSelected,
                  ]}
                  onPress={() => setSelectedCuisine(item)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selectedCuisine === item && styles.chipTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <Text style={styles.sectionTitle}>Chefs near you</Text>
          </>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#F97316" size="large" />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>👨‍🍳</Text>
              <Text style={styles.emptyText}>No chefs found</Text>
              <Text style={styles.emptySubText}>Try adjusting your search or filters</Text>
            </View>
          )
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  wordmark: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F97316',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F97316',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1E',
  },
  chipsScroll: {
    marginTop: 12,
  },
  chipsContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  chipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  chefCard: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: CARD_GAP,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  chefAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  chefAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F97316',
  },
  chefName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  chefCuisine: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  chefMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: '#F97316',
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeAvailable: {
    backgroundColor: '#DCFCE7',
  },
  badgeUnavailable: {
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  badgeTextAvailable: {
    color: '#16A34A',
  },
  badgeTextUnavailable: {
    color: '#9CA3AF',
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingTop: 60,
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
  },
})
