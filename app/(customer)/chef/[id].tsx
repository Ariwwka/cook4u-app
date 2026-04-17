import { useEffect, useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native'
import { useLocalSearchParams, router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/lib/cart'
import type { ChefProfile, Menu } from '@/types'

export default function ChefProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [chef, setChef] = useState<ChefProfile | null>(null)
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const { addItem, items, chefId } = useCart()

  useEffect(() => {
    async function load() {
      const [chefRes, menusRes] = await Promise.all([
        supabase
          .from('chef_profiles')
          .select('id, bio, location, cuisine_tags, rating, review_count, is_available, profile:profiles!chef_profiles_id_fkey(full_name, avatar_url)')
          .eq('id', id)
          .single(),
        supabase
          .from('menus')
          .select('id, name, description, menu_items(id, name, description, price, category, dietary_tags, image_url, is_available)')
          .eq('chef_id', id)
          .eq('is_active', true),
      ])
      setChef(chefRes.data as unknown as ChefProfile)
      setMenus((menusRes.data as unknown as Menu[]) ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  function handleAdd(item: Menu['menu_items'][0]) {
    if (!chef) return
    const result = addItem({
      id: item.id,
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      chefId: id,
      chefName: chef.profile?.full_name ?? 'Chef',
    })
    if (result.conflict) {
      Alert.alert(
        'Different chef',
        'Your cart has items from another chef. Clear it to add from this chef?',
        [
          { text: 'Keep', style: 'cancel' },
          { text: 'Clear & Add', style: 'destructive', onPress: () => {
            useCart.getState().clearCart()
            addItem({ id: item.id, menuItemId: item.id, name: item.name, price: item.price, chefId: id, chefName: chef.profile?.full_name ?? 'Chef' })
          }},
        ],
      )
    }
  }

  const cartCount = items.reduce((s, i) => s + i.quantity, 0)

  if (loading) return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator color="#f97316" size="large" /></View>
  if (!chef) return <View className="flex-1 items-center justify-center"><Text>Chef not found</Text></View>

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView>
        {/* Header */}
        <View className="bg-white px-4 pt-4 pb-5 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mb-3">
            <Text className="text-orange-500 font-medium">← Back</Text>
          </TouchableOpacity>
          <View className="flex-row items-center gap-4">
            {chef.profile?.avatar_url ? (
              <Image source={{ uri: chef.profile.avatar_url }} className="w-16 h-16 rounded-full" />
            ) : (
              <View className="w-16 h-16 rounded-full bg-orange-100 items-center justify-center">
                <Text className="text-orange-500 text-2xl font-bold">{(chef.profile?.full_name ?? 'C')[0]}</Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-800">{chef.profile?.full_name}</Text>
              {chef.location && <Text className="text-gray-400 text-sm">📍 {chef.location}</Text>}
              {chef.rating ? <Text className="text-orange-500 text-sm font-medium mt-0.5">⭐ {Number(chef.rating).toFixed(1)} ({chef.review_count} reviews)</Text> : null}
            </View>
          </View>
          {chef.bio && <Text className="text-gray-500 text-sm mt-3 leading-relaxed">{chef.bio}</Text>}
          {chef.cuisine_tags && (
            <View className="flex-row flex-wrap gap-1.5 mt-2">
              {chef.cuisine_tags.map(t => (
                <View key={t} className="bg-orange-50 border border-orange-100 px-2.5 py-0.5 rounded-full">
                  <Text className="text-orange-600 text-xs">{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Menus */}
        <View className="px-4 pt-4 pb-24">
          {menus.map(menu => (
            <View key={menu.id} className="mb-6">
              <Text className="text-lg font-bold text-gray-800 mb-3">{menu.name}</Text>
              <View className="gap-3">
                {menu.menu_items.filter(i => i.is_available).map(item => {
                  const qty = items.find(i => i.menuItemId === item.id)?.quantity ?? 0
                  return (
                    <View key={item.id} className="bg-white rounded-2xl p-4 border border-orange-50 flex-row items-center gap-3">
                      {item.image_url && <Image source={{ uri: item.image_url }} className="w-16 h-16 rounded-xl" />}
                      <View className="flex-1">
                        <Text className="font-semibold text-gray-800">{item.name}</Text>
                        {item.description && <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={2}>{item.description}</Text>}
                        <Text className="text-orange-500 font-bold mt-1">£{Number(item.price).toFixed(2)}</Text>
                      </View>
                      {qty > 0 ? (
                        <View className="flex-row items-center gap-2">
                          <TouchableOpacity onPress={() => useCart.getState().updateQuantity(item.id, qty - 1)} className="w-8 h-8 bg-orange-100 rounded-full items-center justify-center">
                            <Text className="text-orange-600 font-bold">−</Text>
                          </TouchableOpacity>
                          <Text className="font-bold text-gray-800 w-4 text-center">{qty}</Text>
                          <TouchableOpacity onPress={() => handleAdd(item)} className="w-8 h-8 bg-orange-500 rounded-full items-center justify-center">
                            <Text className="text-white font-bold">+</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => handleAdd(item)} className="bg-orange-500 px-3 py-1.5 rounded-xl">
                          <Text className="text-white font-semibold text-sm">Add</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Floating cart button */}
      {cartCount > 0 && (
        <View className="absolute bottom-4 left-4 right-4">
          <TouchableOpacity onPress={() => router.push('/(customer)/cart')} className="bg-orange-500 rounded-2xl py-4 flex-row items-center justify-between px-5 shadow-lg">
            <View className="w-6 h-6 bg-white/30 rounded-full items-center justify-center">
              <Text className="text-white font-bold text-xs">{cartCount}</Text>
            </View>
            <Text className="text-white font-bold text-base">View Cart</Text>
            <Text className="text-white font-bold">£{useCart.getState().total().toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}
