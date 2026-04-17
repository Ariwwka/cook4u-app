import { useEffect, useState, useCallback } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import type { Menu, MenuItem } from '@/types'

export default function ChefMenusScreen() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [showNewMenu, setShowNewMenu] = useState(false)
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
    setMenus(prev => prev.map(m => ({ ...m, menu_items: m.menu_items.map(i => i.id === itemId ? { ...i, is_available: val } : i) })))
  }

  async function toggleMenu(menuId: string, val: boolean) {
    await supabase.from('menus').update({ is_active: val }).eq('id', menuId)
    setMenus(prev => prev.map(m => m.id === menuId ? { ...m, is_active: val } : m))
  }

  async function createMenu() {
    if (!newMenuName.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('menus').insert({ chef_id: user.id, name: newMenuName.trim(), is_active: true })
    if (error) { Alert.alert('Error', error.message); return }
    setNewMenuName('')
    setShowNewMenu(false)
    fetchMenus()
  }

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}><ActivityIndicator color="#f97316" size="large" /></View>

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }}>My Menus</Text>
        <TouchableOpacity
          onPress={() => setShowNewMenu(true)}
          style={{ backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 5 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Menu</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchMenus() }} tintColor="#f97316" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}
      >
        {/* New menu form */}
        {showNewMenu && (
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1.5, borderColor: '#fed7aa', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 }}>New Menu</Text>
            <TextInput
              value={newMenuName}
              onChangeText={setNewMenuName}
              placeholder="e.g. Lunch Menu, Weekend Specials"
              autoFocus
              placeholderTextColor="#9ca3af"
              style={{ backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111827', marginBottom: 12 }}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowNewMenu(false)} style={{ flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }}>
                <Text style={{ color: '#6b7280', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={createMenu} style={{ flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: '#f97316', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {menus.length === 0 && !showNewMenu ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>🍽️</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>No menus yet</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>Tap "+ Menu" to get started</Text>
          </View>
        ) : (
          menus.map(menu => (
            <View key={menu.id} style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 }}>
              {/* Menu header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: menu.menu_items.length > 0 ? 1 : 0, borderBottomColor: '#f3f4f6' }}>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>{menu.name}</Text>
                  <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{menu.menu_items.length} item{menu.menu_items.length !== 1 ? 's' : ''}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 12, color: menu.is_active ? '#16a34a' : '#9ca3af', fontWeight: '600' }}>{menu.is_active ? 'Active' : 'Hidden'}</Text>
                  <Switch value={!!menu.is_active} onValueChange={v => toggleMenu(menu.id, v)} trackColor={{ false: '#e5e7eb', true: '#f97316' }} thumbColor="#fff" />
                </View>
              </View>

              {/* Items */}
              {menu.menu_items.map((item, idx) => (
                <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: idx < menu.menu_items.length - 1 ? 1 : 0, borderBottomColor: '#f9fafb' }}>
                  <View style={{ width: 36, height: 36, backgroundColor: '#fff7ed', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ fontSize: 18 }}>🍽️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>{item.name}</Text>
                    <Text style={{ fontSize: 13, color: '#f97316', fontWeight: '700', marginTop: 1 }}>£{Number(item.price).toFixed(2)}</Text>
                  </View>
                  <Switch value={!!item.is_available} onValueChange={v => toggleItem(item.id, v)} trackColor={{ false: '#e5e7eb', true: '#f97316' }} thumbColor="#fff" />
                </View>
              ))}

              {/* Add item */}
              {addingTo === menu.id ? (
                <AddItemForm menuId={menu.id} onDone={() => { setAddingTo(null); fetchMenus() }} />
              ) : (
                <TouchableOpacity
                  onPress={() => setAddingTo(menu.id)}
                  style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: menu.menu_items.length > 0 ? 1 : 0, borderTopColor: '#f3f4f6' }}
                >
                  <View style={{ width: 24, height: 24, backgroundColor: '#fff7ed', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#f97316', fontWeight: '800', fontSize: 15 }}>+</Text>
                  </View>
                  <Text style={{ color: '#f97316', fontWeight: '600', fontSize: 14 }}>Add item</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function AddItemForm({ menuId, onDone }: { menuId: string; onDone: () => void }) {
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
    <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6', backgroundColor: '#fafafa' }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 }}>New item</Text>
      <View style={{ gap: 8 }}>
        <TextInput value={name} onChangeText={setName} placeholder="Item name" placeholderTextColor="#9ca3af" style={inputStyle} />
        <TextInput value={price} onChangeText={setPrice} placeholder="Price (£)" keyboardType="decimal-pad" placeholderTextColor="#9ca3af" style={inputStyle} />
        <TextInput value={description} onChangeText={setDescription} placeholder="Description (optional)" placeholderTextColor="#9ca3af" style={inputStyle} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <TouchableOpacity onPress={onDone} style={{ flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }}>
          <Text style={{ color: '#6b7280', fontWeight: '600', fontSize: 13 }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={save} disabled={saving} style={{ flex: 1, paddingVertical: 11, borderRadius: 12, backgroundColor: '#f97316', alignItems: 'center' }}>
          {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add item</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const inputStyle = {
  backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
  paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#111827',
}
