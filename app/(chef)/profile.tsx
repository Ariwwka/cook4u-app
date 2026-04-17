import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

interface ChefFormData {
  full_name: string
  bio: string
  location: string
  pickup_address_line1: string
  pickup_address_postcode: string
  cuisine_tags_raw: string
  is_available: boolean
}

export default function ChefProfileScreen() {
  const [form, setForm] = useState<ChefFormData>({
    full_name: '',
    bio: '',
    location: '',
    pickup_address_line1: '',
    pickup_address_postcode: '',
    cuisine_tags_raw: '',
    is_available: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [profileRes, chefRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('chef_profiles').select('bio, location, pickup_address_line1, pickup_address_postcode, cuisine_tags, is_available').eq('id', user.id).single(),
      ])
      setForm({
        full_name: profileRes.data?.full_name ?? '',
        bio: chefRes.data?.bio ?? '',
        location: chefRes.data?.location ?? '',
        pickup_address_line1: chefRes.data?.pickup_address_line1 ?? '',
        pickup_address_postcode: chefRes.data?.pickup_address_postcode ?? '',
        cuisine_tags_raw: (chefRes.data?.cuisine_tags ?? []).join(', '),
        is_available: chefRes.data?.is_available ?? false,
      })
      setLoading(false)
    }
    load()
  }, [])

  function set(key: keyof ChefFormData, val: string | boolean) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function save() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const tags = form.cuisine_tags_raw.split(',').map(t => t.trim()).filter(Boolean)

      await Promise.all([
        supabase.from('profiles').update({ full_name: form.full_name.trim() }).eq('id', user.id),
        supabase.from('chef_profiles').upsert({
          id: user.id,
          bio: form.bio.trim() || null,
          location: form.location.trim() || null,
          pickup_address_line1: form.pickup_address_line1.trim() || null,
          pickup_address_postcode: form.pickup_address_postcode.trim().toUpperCase() || null,
          cuisine_tags: tags.length ? tags : null,
          is_available: form.is_available,
        }),
      ])
      Alert.alert('Saved', 'Profile updated.')
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  if (loading) return <View className="flex-1 items-center justify-center bg-white"><ActivityIndicator color="#f97316" size="large" /></View>

  const hasPickupAddress = form.pickup_address_line1.trim() && form.pickup_address_postcode.trim()

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-800">My Profile</Text>
          <TouchableOpacity onPress={signOut} className="py-1 px-3 rounded-xl border border-gray-200">
            <Text className="text-gray-500 text-sm">Sign out</Text>
          </TouchableOpacity>
        </View>

        {!hasPickupAddress && (
          <View className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex-row gap-2">
            <Text>⚠️</Text>
            <Text className="text-amber-700 text-sm flex-1">No pickup address set — required to book couriers.</Text>
          </View>
        )}

        {/* Availability toggle */}
        <View className="mx-4 mt-4 bg-white rounded-2xl border border-orange-50 px-4 py-3 flex-row items-center justify-between">
          <View>
            <Text className="font-semibold text-gray-800">Available for orders</Text>
            <Text className="text-gray-400 text-xs mt-0.5">{form.is_available ? 'You are visible to customers' : 'You are hidden'}</Text>
          </View>
          <Switch
            value={form.is_available}
            onValueChange={(v) => set('is_available', v)}
            trackColor={{ false: '#e5e7eb', true: '#f97316' }}
            thumbColor="white"
          />
        </View>

        <View className="mx-4 mt-4 gap-3">
          <Field label="Full name" value={form.full_name} onChangeText={v => set('full_name', v)} placeholder="Your name" />
          <Field label="Bio" value={form.bio} onChangeText={v => set('bio', v)} placeholder="Tell customers about yourself…" multiline />
          <Field label="Area / Borough" value={form.location} onChangeText={v => set('location', v)} placeholder="e.g. Hackney, London" />
          <Field label="Cuisine tags" value={form.cuisine_tags_raw} onChangeText={v => set('cuisine_tags_raw', v)} placeholder="e.g. Italian, Vegan, Halal" hint="Comma-separated" />

          <View className="bg-white rounded-2xl border border-orange-50 px-4 py-3">
            <Text className="text-sm font-semibold text-gray-700 mb-3">Courier pickup address</Text>
            <Field label="Street address" value={form.pickup_address_line1} onChangeText={v => set('pickup_address_line1', v)} placeholder="123 High Street, London" />
            <View className="mt-2">
              <Field label="Postcode" value={form.pickup_address_postcode} onChangeText={v => set('pickup_address_postcode', v)} placeholder="E8 1AB" autoCapitalize="characters" />
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={save} disabled={saving} className="mx-4 mt-6 bg-orange-500 rounded-2xl py-4 items-center">
          {saving ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Save Profile</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function Field({ label, value, onChangeText, placeholder, multiline, hint, autoCapitalize }: {
  label: string; value: string; onChangeText: (v: string) => void
  placeholder?: string; multiline?: boolean; hint?: string; autoCapitalize?: 'none' | 'words' | 'sentences' | 'characters'
}) {
  return (
    <View>
      <Text className="text-sm font-medium text-gray-700 mb-1">{label}{hint ? <Text className="text-gray-400 font-normal"> · {hint}</Text> : null}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        multiline={multiline}
        autoCapitalize={autoCapitalize ?? (multiline ? 'sentences' : 'words')}
        className={`bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 ${multiline ? 'min-h-[80px]' : ''}`}
        textAlignVertical={multiline ? 'top' : 'auto'}
      />
    </View>
  )
}
