import { useEffect, useState, useCallback } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

interface Address {
  id: string
  line1: string
  line2: string | null
  city: string
  country: string
  postcode: string
  is_default: boolean
}

export default function AccountScreen() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAddr, setNewAddr] = useState({ line1: '', line2: '', city: '', postcode: '' })

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email ?? '')
    const [profileRes, addrRes] = await Promise.all([
      supabase.from('profiles').select('full_name, phone').eq('id', user.id).single(),
      supabase.from('customer_addresses').select('id, line1, line2, city, country, postcode, is_default').eq('customer_id', user.id).order('is_default', { ascending: false }),
    ])
    setFullName(profileRes.data?.full_name ?? '')
    setPhone(profileRes.data?.phone ?? '')
    setAddresses((addrRes.data as Address[]) ?? [])
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveProfile() {
    if (!fullName.trim()) { Alert.alert('Name is required'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('profiles').update({ full_name: fullName.trim(), phone: phone.trim() || null }).eq('id', user.id)
    setSaving(false)
    if (error) Alert.alert('Error', error.message)
    else Alert.alert('Saved', 'Profile updated.')
  }

  async function addAddress() {
    if (!newAddr.line1.trim() || !newAddr.city.trim() || !newAddr.postcode.trim()) {
      Alert.alert('Please fill in address, city and postcode')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const isFirst = addresses.length === 0
    const { error } = await supabase.from('customer_addresses').insert({
      customer_id: user.id,
      line1: newAddr.line1.trim(),
      line2: newAddr.line2.trim() || null,
      city: newAddr.city.trim(),
      country: 'United Kingdom',
      postcode: newAddr.postcode.trim().toUpperCase(),
      is_default: isFirst,
    })
    if (error) { Alert.alert('Error', error.message); return }
    setNewAddr({ line1: '', line2: '', city: '', postcode: '' })
    setShowAddForm(false)
    load()
  }

  async function setDefault(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('customer_addresses').update({ is_default: false }).eq('customer_id', user.id)
    await supabase.from('customer_addresses').update({ is_default: true }).eq('id', id).eq('customer_id', user.id)
    load()
  }

  async function deleteAddress(id: string) {
    Alert.alert('Delete address?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const addr = addresses.find(a => a.id === id)
        await supabase.from('customer_addresses').delete().eq('id', id).eq('customer_id', user.id)
        if (addr?.is_default) {
          const remaining = addresses.filter(a => a.id !== id)
          if (remaining.length > 0) {
            await supabase.from('customer_addresses').update({ is_default: true }).eq('id', remaining[0].id)
          }
        }
        load()
      }},
    ])
  }

  async function signOut() {
    Alert.alert('Sign out?', 'You will be returned to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => {
        await supabase.auth.signOut()
        router.replace('/(auth)/login')
      }},
    ])
  }

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}><ActivityIndicator color="#f97316" size="large" /></View>

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.3 }}>Account</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 48, gap: 14 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#f97316" />}
      >
        {/* Profile card */}
        <Card title="Personal info">
          <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your name" autoCapitalize="words" />
          <View style={{ marginTop: 10 }}>
            <Text style={labelStyle}>Email address</Text>
            <View style={[inputBase, { backgroundColor: '#f3f4f6' }]}>
              <Text style={{ fontSize: 13, color: '#9ca3af' }}>{email}</Text>
            </View>
          </View>
          <View style={{ marginTop: 10 }}>
            <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+44 7700 000000" keyboardType="phone-pad" autoCapitalize="none" />
          </View>
          <TouchableOpacity
            onPress={saveProfile}
            disabled={saving}
            style={{ marginTop: 14, backgroundColor: '#f97316', borderRadius: 13, paddingVertical: 13, alignItems: 'center' }}
          >
            {saving ? <ActivityIndicator color="white" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Save Profile</Text>}
          </TouchableOpacity>
        </Card>

        {/* Delivery addresses */}
        <Card title="Delivery addresses" subtitle={`${addresses.length} saved`}>
          {addresses.length === 0 && !showAddForm && (
            <Text style={{ fontSize: 13, color: '#9ca3af', marginBottom: 10 }}>No addresses saved yet.</Text>
          )}

          {addresses.map(addr => (
            <View key={addr.id} style={{
              borderWidth: 1.5, borderColor: addr.is_default ? '#fed7aa' : '#f3f4f6',
              backgroundColor: addr.is_default ? '#fff7ed' : '#fff',
              borderRadius: 14, padding: 12, marginBottom: 8,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{addr.line1}</Text>
                  {addr.line2 ? <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{addr.line2}</Text> : null}
                  <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{addr.city}, {addr.postcode}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  {addr.is_default ? (
                    <View style={{ backgroundColor: '#fed7aa', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#c2410c' }}>Default</Text>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => setDefault(addr.id)} style={{ borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 11, color: '#374151', fontWeight: '600' }}>Set default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => deleteAddress(addr.id)}>
                    <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {showAddForm ? (
            <View style={{ backgroundColor: '#f9fafb', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 2 }}>New address</Text>
              <SmallInput value={newAddr.line1} onChangeText={v => setNewAddr(p => ({ ...p, line1: v }))} placeholder="Street address" />
              <SmallInput value={newAddr.line2} onChangeText={v => setNewAddr(p => ({ ...p, line2: v }))} placeholder="Flat / floor (optional)" />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><SmallInput value={newAddr.city} onChangeText={v => setNewAddr(p => ({ ...p, city: v }))} placeholder="City" /></View>
                <View style={{ flex: 1 }}><SmallInput value={newAddr.postcode} onChangeText={v => setNewAddr(p => ({ ...p, postcode: v }))} placeholder="Postcode" autoCapitalize="characters" /></View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity onPress={() => setShowAddForm(false)} style={{ flex: 1, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={addAddress} style={{ flex: 1, paddingVertical: 10, borderRadius: 11, backgroundColor: '#f97316', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#fff', fontWeight: '700' }}>Add address</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setShowAddForm(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 }}>
              <View style={{ width: 22, height: 22, backgroundColor: '#fff7ed', borderRadius: 11, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#f97316', fontWeight: '800', fontSize: 14 }}>+</Text>
              </View>
              <Text style={{ fontSize: 13, color: '#f97316', fontWeight: '600' }}>Add new address</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Sign out */}
        <TouchableOpacity
          onPress={signOut}
          style={{ backgroundColor: '#fff', borderRadius: 16, paddingVertical: 15, alignItems: 'center', borderWidth: 1.5, borderColor: '#fecaca', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
        >
          <Text style={{ fontSize: 20 }}>👋</Text>
          <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 15 }}>Sign Out</Text>
        </TouchableOpacity>

        {/* App version */}
        <Text style={{ textAlign: 'center', fontSize: 11, color: '#d1d5db', marginTop: 4 }}>Cook4U v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 12, color: '#9ca3af' }}>{subtitle}</Text>}
      </View>
      {children}
    </View>
  )
}

const labelStyle = { fontSize: 12, fontWeight: '600' as const, color: '#374151', marginBottom: 5 }
const inputBase = { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text style={labelStyle}>{label}</Text>
      <TextInput {...props} placeholderTextColor="#9ca3af" style={{ ...inputBase, fontSize: 13, color: '#111827', backgroundColor: '#f9fafb' }} />
    </View>
  )
}

function SmallInput(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      {...props}
      placeholderTextColor="#9ca3af"
      style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: '#111827' }}
    />
  )
}
