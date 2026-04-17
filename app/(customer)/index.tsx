import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, RefreshControl } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { ChefProfile } from '@/types'

export default function BrowseScreen() {
  const [chefs, setChefs] = useState<ChefProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState('')

  async function fetchChefs() {
    const { data } = await supabase
      .from('chef_profiles')
      .select('id, bio, location, cuisine_tags, rating, review_count, is_available, profile:profiles!chef_profiles_id_fkey(full_name, avatar_url)')
      .eq('is_available', true)
      .eq('verification_status', 'verified')
    setChefs((data as unknown as ChefProfile[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { fetchChefs() }, [])

  const filtered = chefs.filter(c => {
    const name = c.profile?.full_name?.toLowerCase() ?? ''
    const cuisine = c.cuisine_tags?.join(' ').toLowerCase() ?? ''
    const q = search.toLowerCase()
    return name.includes(q) || cuisine.includes(q)
  })

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }}>Find a Chef</Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>Home-cooked meals near you</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 14, paddingHorizontal: 14, marginTop: 14, gap: 8 }}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search chefs or cuisines…"
            placeholderTextColor="#9ca3af"
            style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{ color: '#9ca3af', fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#f97316" size="large" />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChefs() }} tintColor="#f97316" />}
        >
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <Text style={{ fontSize: 56, marginBottom: 12 }}>👨‍🍳</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>No chefs found</Text>
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Try a different search</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filtered.map(chef => <ChefCard key={chef.id} chef={chef} />)}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

function ChefCard({ chef }: { chef: ChefProfile }) {
  const initials = (chef.profile?.full_name ?? 'C')[0].toUpperCase()
  return (
    <TouchableOpacity
      onPress={() => router.push(`/(customer)/chef/${chef.id}`)}
      style={{
        backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
      }}
    >
      {/* Color banner */}
      <View style={{ backgroundColor: '#fff7ed', height: 8 }} />

      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {chef.profile?.avatar_url ? (
            <Image source={{ uri: chef.profile.avatar_url }} style={{ width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#fed7aa' }} />
          ) : (
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff7ed', borderWidth: 2, borderColor: '#fed7aa', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#f97316', fontSize: 22, fontWeight: '800' }}>{initials}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>{chef.profile?.full_name ?? 'Chef'}</Text>
              <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#16a34a' }}>Open</Text>
              </View>
            </View>
            {chef.location && (
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>📍 {chef.location}</Text>
            )}
            {chef.rating ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 }}>
                <Text style={{ fontSize: 13, color: '#f97316', fontWeight: '700' }}>★ {Number(chef.rating).toFixed(1)}</Text>
                <Text style={{ fontSize: 12, color: '#9ca3af' }}>({chef.review_count} reviews)</Text>
              </View>
            ) : null}
          </View>
        </View>

        {chef.bio ? (
          <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 12, lineHeight: 18 }} numberOfLines={2}>{chef.bio}</Text>
        ) : null}

        {chef.cuisine_tags && chef.cuisine_tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {chef.cuisine_tags.slice(0, 4).map(tag => (
              <View key={tag} style={{ backgroundColor: '#fff7ed', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 12, color: '#ea580c', fontWeight: '600' }}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  )
}
