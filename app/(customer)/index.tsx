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
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-800">Find a Chef</Text>
        <Text className="text-gray-400 text-sm mt-0.5">Home-cooked meals near you</Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search chefs or cuisines..."
          className="mt-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-800"
        />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f97316" size="large" />
        </View>
      ) : (
        <ScrollView
          className="px-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchChefs() }} tintColor="#f97316" />}
        >
          {filtered.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-4xl mb-3">👨‍🍳</Text>
              <Text className="text-gray-500 text-base">No chefs found</Text>
            </View>
          ) : (
            <View className="gap-3 pb-6 mt-2">
              {filtered.map(chef => (
                <TouchableOpacity
                  key={chef.id}
                  onPress={() => router.push(`/(customer)/chef/${chef.id}`)}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-orange-50"
                >
                  <View className="flex-row items-center gap-3">
                    {chef.profile?.avatar_url ? (
                      <Image source={{ uri: chef.profile.avatar_url }} className="w-14 h-14 rounded-full" />
                    ) : (
                      <View className="w-14 h-14 rounded-full bg-orange-100 items-center justify-center">
                        <Text className="text-orange-500 text-xl font-bold">
                          {(chef.profile?.full_name ?? 'C')[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="font-bold text-gray-800 text-base">{chef.profile?.full_name ?? 'Chef'}</Text>
                      {chef.location && <Text className="text-gray-400 text-xs mt-0.5">📍 {chef.location}</Text>}
                      {chef.cuisine_tags && chef.cuisine_tags.length > 0 && (
                        <View className="flex-row flex-wrap gap-1 mt-1.5">
                          {chef.cuisine_tags.slice(0, 3).map(tag => (
                            <View key={tag} className="bg-orange-50 px-2 py-0.5 rounded-full">
                              <Text className="text-orange-600 text-xs">{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <View className="items-end">
                      {chef.rating ? (
                        <Text className="text-orange-500 font-bold text-sm">⭐ {Number(chef.rating).toFixed(1)}</Text>
                      ) : null}
                      <Text className="text-xs text-green-500 font-medium mt-1">Open</Text>
                    </View>
                  </View>
                  {chef.bio && <Text className="text-gray-500 text-xs mt-2 leading-relaxed" numberOfLines={2}>{chef.bio}</Text>}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
