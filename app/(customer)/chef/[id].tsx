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
          .eq('id', id).single(),
        supabase
          .from('menus')
          .select('id, name, description, menu_items(id, name, description, price, category, dietary_tags, image_url, is_available)')
          .eq('chef_id', id).eq('is_active', true),
      ])
      setChef(chefRes.data as unknown as ChefProfile)
      setMenus((menusRes.data as unknown as Menu[]) ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  function handleAdd(item: Menu['menu_items'][0]) {
    if (!chef) return
    const result = addItem({ id: item.id, menuItemId: item.id, name: item.name, price: item.price, chefId: id, chefName: chef.profile?.full_name ?? 'Chef' })
    if (result.conflict) {
      Alert.alert('Different chef', 'Your cart has items from another chef. Clear it to add from this chef?', [
        { text: 'Keep', style: 'cancel' },
        { text: 'Clear & Add', style: 'destructive', onPress: () => {
          useCart.getState().clearCart()
          addItem({ id: item.id, menuItemId: item.id, name: item.name, price: item.price, chefId: id, chefName: chef.profile?.full_name ?? 'Chef' })
        }},
      ])
    }
  }

  const cartCount = items.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = useCart.getState().total()

  if (loading) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator color="#f97316" size="large" />
    </View>
  )
  if (!chef) return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#6b7280' }}>Chef not found</Text>
    </View>
  )

  const initials = (chef.profile?.full_name ?? 'C')[0].toUpperCase()
  const itemCount = menus.reduce((s, m) => s + m.menu_items.filter(i => i.is_available).length, 0)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}
          >
            <Text style={{ fontSize: 22, color: '#f97316' }}>←</Text>
            <Text style={{ fontSize: 15, color: '#f97316', fontWeight: '600' }}>Back</Text>
          </TouchableOpacity>

          {/* Chef hero */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8 }}>
            <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
              {chef.profile?.avatar_url ? (
                <Image source={{ uri: chef.profile.avatar_url }} style={{ width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#fed7aa' }} />
              ) : (
                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff7ed', borderWidth: 3, borderColor: '#fed7aa', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#f97316', fontSize: 28, fontWeight: '800' }}>{initials}</Text>
                </View>
              )}
              <View style={{ flex: 1, paddingTop: 4 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.3 }}>{chef.profile?.full_name}</Text>
                {chef.location && <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 3 }}>📍 {chef.location}</Text>}
                {chef.rating ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                    <View style={{ backgroundColor: '#fff7ed', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexDirection: 'row', gap: 4 }}>
                      <Text style={{ fontSize: 13, color: '#f97316', fontWeight: '700' }}>★ {Number(chef.rating).toFixed(1)}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#9ca3af' }}>{chef.review_count} reviews</Text>
                    <View style={{ backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                      <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '700' }}>Open</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </View>

            {chef.bio && (
              <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 14, lineHeight: 20 }}>{chef.bio}</Text>
            )}

            {chef.cuisine_tags && chef.cuisine_tags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {chef.cuisine_tags.map(t => (
                  <View key={t} style={{ backgroundColor: '#fff7ed', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 12, color: '#ea580c', fontWeight: '600' }}>{t}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 12 }}>{itemCount} item{itemCount !== 1 ? 's' : ''} available</Text>
          </View>
        </View>

        {/* Menus */}
        <View style={{ padding: 16, gap: 24 }}>
          {menus.map(menu => (
            <View key={menu.id}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12, letterSpacing: -0.3 }}>{menu.name}</Text>
              <View style={{ gap: 10 }}>
                {menu.menu_items.filter(i => i.is_available).map(item => {
                  const qty = items.find(i => i.menuItemId === item.id)?.quantity ?? 0
                  return (
                    <View key={item.id} style={{
                      backgroundColor: '#fff', borderRadius: 18,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
                      flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
                    }}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={{ width: 70, height: 70, borderRadius: 14 }} />
                      ) : (
                        <View style={{ width: 70, height: 70, borderRadius: 14, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 28 }}>🍽️</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{item.name}</Text>
                        {item.description && (
                          <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 3, lineHeight: 16 }} numberOfLines={2}>{item.description}</Text>
                        )}
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#f97316', marginTop: 6 }}>£{Number(item.price).toFixed(2)}</Text>
                      </View>
                      {qty > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <TouchableOpacity
                            onPress={() => useCart.getState().updateQuantity(item.id, qty - 1)}
                            style={{ width: 34, height: 34, backgroundColor: '#f3f4f6', borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Text style={{ color: '#374151', fontSize: 18, fontWeight: '700', lineHeight: 22 }}>−</Text>
                          </TouchableOpacity>
                          <Text style={{ fontWeight: '800', color: '#111827', fontSize: 16, minWidth: 16, textAlign: 'center' }}>{qty}</Text>
                          <TouchableOpacity
                            onPress={() => handleAdd(item)}
                            style={{ width: 34, height: 34, backgroundColor: '#f97316', borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 22 }}>+</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleAdd(item)}
                          style={{
                            backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12,
                            shadowColor: '#f97316', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 2,
                          }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Add</Text>
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

      {/* Floating cart */}
      {cartCount > 0 && (
        <View style={{ position: 'absolute', bottom: 20, left: 16, right: 16 }}>
          <TouchableOpacity
            onPress={() => router.push('/(customer)/cart')}
            style={{
              backgroundColor: '#111827', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 20,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 8,
            }}
          >
            <View style={{ backgroundColor: '#f97316', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{cartCount}</Text>
            </View>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>View Cart</Text>
            <Text style={{ color: '#f97316', fontWeight: '800', fontSize: 16 }}>£{cartTotal.toFixed(2)}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  )
}
