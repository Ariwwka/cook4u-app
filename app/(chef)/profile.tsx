import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

interface Form {
  full_name: string
  bio: string
  location: string
  pickup_address_line1: string
  pickup_address_postcode: string
  cuisine_tags_raw: string
  is_available: boolean
}

export default function ChefProfileScreen() {
  const [form, setForm] = useState<Form>({ full_name: '', bio: '', location: '', pickup_address_line1: '', pickup_address_postcode: '', cuisine_tags_raw: '', is_available: false })
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

  function set(key: keyof Form, val: string | boolean) {
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
      Alert.alert('Saved', 'Profile updated successfully.')
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

  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}><ActivityIndicator color="#f97316" size="large" /></View>

  const hasPickup = form.pickup_address_line1.trim() && form.pickup_address_postcode.trim()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        {/* Header */}
        <View style={{ backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.3 }}>Profile</Text>
          <TouchableOpacity onPress={signOut} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
            <Text style={{ fontSize: 13, color: '#6b7280', fontWeight: '600' }}>Sign out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ padding: 16, gap: 16 }}>
          {/* Pickup address warning */}
          {!hasPickup && (
            <View style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 16, padding: 14, flexDirection: 'row', gap: 10 }}>
              <Text style={{ fontSize: 18 }}>⚠️</Text>
              <Text style={{ fontSize: 13, color: '#92400e', flex: 1, lineHeight: 18 }}>
                Add a pickup address to enable courier dispatch when orders are ready.
              </Text>
            </View>
          )}

          {/* Availability */}
          <View style={{
            backgroundColor: form.is_available ? '#f0fdf4' : '#fff',
            borderWidth: 1.5, borderColor: form.is_available ? '#bbf7d0' : '#e5e7eb',
            borderRadius: 20, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>Available for orders</Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                {form.is_available ? '✓ Visible to customers' : 'Hidden from customers'}
              </Text>
            </View>
            <Switch
              value={form.is_available}
              onValueChange={v => set('is_available', v)}
              trackColor={{ false: '#e5e7eb', true: '#f97316' }}
              thumbColor="#fff"
            />
          </View>

          {/* Basic info */}
          <Section title="Basic info">
            <Field label="Full name" value={form.full_name} onChangeText={v => set('full_name', v)} placeholder="Your name" autoCapitalize="words" />
            <Field label="Bio" value={form.bio} onChangeText={v => set('bio', v)} placeholder="Tell customers about yourself and your cooking…" multiline />
            <Field label="Area / Borough" value={form.location} onChangeText={v => set('location', v)} placeholder="e.g. Hackney, London" />
            <Field label="Cuisine tags" value={form.cuisine_tags_raw} onChangeText={v => set('cuisine_tags_raw', v)} placeholder="e.g. Italian, Vegan, Halal" hint="Comma-separated" />
          </Section>

          {/* Pickup address */}
          <Section title="Courier pickup address" subtitle="Required for booking Gophr deliveries">
            <Field label="Street address" value={form.pickup_address_line1} onChangeText={v => set('pickup_address_line1', v)} placeholder="123 High Street, London" />
            <Field label="Postcode" value={form.pickup_address_postcode} onChangeText={v => set('pickup_address_postcode', v)} placeholder="E8 1AB" autoCapitalize="characters" />
          </Section>
        </View>

        <TouchableOpacity
          onPress={save}
          disabled={saving}
          style={{
            marginHorizontal: 16, backgroundColor: '#f97316', borderRadius: 18, paddingVertical: 17, alignItems: 'center',
            shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
          }}
        >
          {saving ? <ActivityIndicator color="white" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Save Profile</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: subtitle ? 2 : 14 }}>{title}</Text>
      {subtitle && <Text style={{ fontSize: 12, color: '#9ca3af', marginBottom: 14 }}>{subtitle}</Text>}
      <View style={{ gap: 12 }}>
        {children}
      </View>
    </View>
  )
}

function Field({ label, hint, ...props }: { label: string; hint?: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
        {label}{hint ? <Text style={{ color: '#9ca3af', fontWeight: '400' }}> · {hint}</Text> : null}
      </Text>
      <TextInput
        {...props}
        placeholderTextColor="#9ca3af"
        style={{
          backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
          paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#111827',
          ...(props.multiline ? { minHeight: 80, textAlignVertical: 'top' } : {}),
        }}
      />
    </View>
  )
}
