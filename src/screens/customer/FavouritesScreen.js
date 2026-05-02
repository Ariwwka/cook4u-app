import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

function FavouriteCard({ favourite, onPress }) {
  const chef = favourite.profiles
  const chefName = chef?.full_name ?? 'Chef'
  const initials = chefName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{chefName}</Text>
      </View>
      <Text style={styles.heartIcon}>❤️</Text>
    </TouchableOpacity>
  )
}

export default function FavouritesScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [favourites, setFavourites] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFavourites = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('chef_favorites')
        .select('*, profiles:chef_id(id, full_name)')
        .eq('customer_id', user.id)

      if (error) {
        console.error('Error fetching favourites:', error)
      } else {
        setFavourites(data || [])
      }
    } catch (err) {
      console.error('fetchFavourites exception:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchFavourites()
  }, [fetchFavourites])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favourites</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#F97316" size="large" />
        </View>
      ) : (
        <FlatList
          data={favourites}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FavouriteCard
              favourite={item}
              onPress={() =>
                navigation.navigate('BrowseTab', {
                  screen: 'ChefDetail',
                  params: { chefId: item.chef_id },
                })
              }
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>❤️</Text>
              <Text style={styles.emptyText}>No favourites yet</Text>
              <Text style={styles.emptySubText}>
                Save your favourite chefs to find them quickly
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F97316',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  heartIcon: {
    fontSize: 20,
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
