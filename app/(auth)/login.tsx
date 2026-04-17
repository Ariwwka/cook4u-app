import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function LoginScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [role, setRole] = useState<'customer' | 'chef'>('customer')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setError('')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        const userRole = data.user?.user_metadata?.role ?? 'customer'
        router.replace(userRole === 'chef' ? '/(chef)/orders' : '/(customer)/')
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role, full_name: fullName } },
        })
        if (error) throw error
        if (data.session) {
          router.replace(role === 'chef' ? '/(chef)/orders' : '/(customer)/')
        } else {
          setError('Check your email to confirm your account.')
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Hero */}
        <View style={{ backgroundColor: '#f97316', paddingTop: 80, paddingBottom: 48, paddingHorizontal: 32, alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 32 }}>🍳</Text>
          </View>
          <Text style={{ fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>Cook4U</Text>
          <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Home-cooked meals, delivered</Text>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 32 }}>
          {/* Tab toggle */}
          <View style={{ flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 14, padding: 4, marginBottom: 24 }}>
            {(['signin', 'signup'] as const).map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center',
                  backgroundColor: mode === m ? '#fff' : 'transparent',
                  shadowColor: mode === m ? '#000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: mode === m ? 0.08 : 0,
                  shadowRadius: 2,
                  elevation: mode === m ? 2 : 0,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: mode === m ? '#111827' : '#9ca3af' }}>
                  {m === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Role selector */}
          {mode === 'signup' && (
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 10 }}>I want to…</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {([
                  { key: 'customer', emoji: '🍽️', label: 'Order food', sub: 'Browse local chefs' },
                  { key: 'chef', emoji: '👨‍🍳', label: 'Cook & earn', sub: 'Sell your dishes' },
                ] as const).map(r => (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => setRole(r.key)}
                    style={{
                      flex: 1, borderRadius: 16, padding: 16, alignItems: 'center',
                      backgroundColor: role === r.key ? '#fff7ed' : '#f9fafb',
                      borderWidth: 2,
                      borderColor: role === r.key ? '#f97316' : '#e5e7eb',
                    }}
                  >
                    <Text style={{ fontSize: 28, marginBottom: 6 }}>{r.emoji}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: role === r.key ? '#ea580c' : '#374151' }}>{r.label}</Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{r.sub}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Inputs */}
          {mode === 'signup' && (
            <InputField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your name" autoCapitalize="words" />
          )}
          <InputField label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <InputField label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

          {error ? (
            <View style={{ backgroundColor: '#fef2f2', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' }}>
              <Text style={{ color: '#dc2626', fontSize: 13, textAlign: 'center' }}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            style={{
              backgroundColor: '#f97316', borderRadius: 16, paddingVertical: 16,
              alignItems: 'center', marginTop: 4,
              shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
            }}
          >
            {loading ? <ActivityIndicator color="white" /> : (
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

function InputField({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>{label}</Text>
      <TextInput
        {...props}
        style={{
          backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb',
          borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
          fontSize: 15, color: '#111827',
        }}
        placeholderTextColor="#9ca3af"
      />
    </View>
  )
}
