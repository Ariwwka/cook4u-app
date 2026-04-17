import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import type { Menu, MenuItem } from '@/types'

function ItemRow({ item, onToggle }: { item: MenuItem; onToggle: (id: string, val: boolean) => void }) {
  return (
    <View className="flex-row items-center px-4 py-3 border-b border-gray-50 last:border-0">
      <View className="flex-1">
        <Text className="font-medium text-gray-800">{item.name}</Text>
        <Text className="text-orange-500 text-sm">£{Number(item.price).toFixed(2)}</Text>
        {item.description && <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>{item.description}</Text>}
      </View>
      <Switch
        value={item.is_available}
        onValueChange={(v) => onToggle(item.id, v)}
        trackColor={{ false: '#e5e7eb', true: '#f97316' }}
        thumbColor="white"
      />
    </View>
  )
}

function AddItemModal({ menuId, onDone }: { menuId: string; onDone: () => void }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!name.trim() || !price.trim()) { Alert.alert('Name and price are required'); return }
    const p = parseFloat(price)
    if (isNaN(p) || p <= 0) { Alert.alert('Enter a valid price'); return }
    setSaving(true)
    const { error } = await supabase.from('menu_items').insert({ menu_id: menuId, name: name.trim(), price: p, description: description.trim() || null, is_available: true })
    setSaving(false)
    if (error) { Alert.alert('Error', error.message); return }
    onDone()
  }

  return (
    <View className="bg-white rounded-2xl p-4 mx-4 mt-3 border border-orange-100">
      <Text className="font-bold text-gray-800 mb-3">New item</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Item name" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 mb-2" />
      <TextInput value={price} onChangeText={setPrice} placeholder="Price (£)" keyboardType="decimal-pad" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 mb-2" />
      <TextInput value={description} onChangeText={setDescription} placeholder="Description (optional)" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 mb-3" />
      <View className="flex-row gap-2">
        <TouchableOpacity onPress={onDone} className="flex-1 py-2.5 rounded-xl border border-gray-200 items-center">
          <Text className="text-gray-500 font-medium text-sm">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={save} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-orange-500 items-center">
          {saving ? <ActivityIndicator color="white" size="small" /> : <Text className="text-white font-semibold text-sm">Add</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function ChefMenusScreen() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [creatingMenu, setCreatingMenu] = useState(false)
  const [newMenuName, setNewMenuName] = useState('')

  const fetchMenus = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('menus')
      .select('id, name, is_active, menu_items(id, name, description, price, is_available, category)')
      .eq('chef_id', user.id)
      .order('created_at', { ascending: true })
    setMenus((data as unknown as Menu[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { fetchMenus() }, [fetchMenus])

  async function toggleItem(itemId: string, val: boolean) {
    await supabase.from('menu_items').update({ is_available: val }).eq('id', itemId)
    setMenus(prev => prev.map(m => ({
      ...m,
      menu_items: m.menu_items.map(i => i.id === itemId ? { ...i, is_available: val } : i),
    })))
  }

  async function toggleMenu(menuId: string, val: boolean) {
    await supabase.from('menus').update({ is_active: val }).eq('id', menuId)
    setMenus(prev => prev.map(m => m.id === menuId ? { ...m, is_active: val } : m))
  }

  async function createMenu() {
    if (!newMenuName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setCreatingMenu(false)
    const { error } = await supabase.from('menus').insert({ chef_id: user.id, name: newMenuName.trim(), is_active: true })
    if (error) { Alert.alert('Error', error.message); return }
    setNewMenuName('')
    fetchMenus()
  }

  if (loading) return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator color="#f97316" size="large" /></View>

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        <Text className="text-2xl font-bold text-gray-800">My Menus</Text>
        <TouchableOpacity onPress={() => setCreatingMenu(true)} className="bg-orange-500 px-4 py-2 rounded-xl">
          <Text className="text-white font-semibold text-sm">+ Menu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMenus() }} tintColor="#f97316" />}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* New menu form */}
        {creatingMenu && (
          <View className="bg-white rounded-2xl p-4 mx-4 mt-3 border border-orange-100">
            <TextInput value={newMenuName} onChangeText={setNewMenuName} placeholder="Menu name" className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 mb-3" autoFocus />
            <View className="flex-row gap-2">
              <TouchableOpacity onPress={() => setCreatingMenu(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 items-center">
                <Text className="text-gray-500 font-medium text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createMenu} className="flex-1 py-2.5 rounded-xl bg-orange-500 items-center">
                <Text className="text-white font-semibold text-sm">Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {menus.length === 0 && !creatingMenu ? (
          <View className="items-center py-20">
            <Text className="text-5xl mb-3">🍽️</Text>
            <Text className="text-gray-500 text-base">No menus yet</Text>
          </View>
        ) : (
          <View className="gap-4 px-4 mt-3">
            {menus.map(menu => (
              <View key={menu.id} className="bg-white rounded-2xl border border-orange-50 overflow-hidden">
                <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-50">
                  <Text className="font-bold text-gray-800 text-base">{menu.name}</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-gray-400 text-xs">{menu.is_active ? 'Active' : 'Hidden'}</Text>
                    <Switch
                      value={menu.is_active}
                      onValueChange={(v) => toggleMenu(menu.id, v)}
                      trackColor={{ false: '#e5e7eb', true: '#f97316' }}
                      thumbColor="white"
                    />
                  </View>
                </View>

                {menu.menu_items.map(item => (
                  <ItemRow key={item.id} item={item} onToggle={toggleItem} />
                ))}

                {menu.menu_items.length === 0 && addingTo !== menu.id && (
                  <Text className="text-gray-400 text-sm px-4 py-3">No items yet</Text>
                )}

                {addingTo === menu.id ? (
                  <AddItemModal menuId={menu.id} onDone={() => { setAddingTo(null); fetchMenus() }} />
                ) : (
                  <TouchableOpacity onPress={() => setAddingTo(menu.id)} className="px-4 py-3 flex-row items-center gap-1">
                    <Text className="text-orange-500 font-medium text-sm">+ Add item</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
