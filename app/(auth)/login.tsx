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
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <View className="flex-1 px-6 pt-20 pb-10">
          {/* Logo */}
          <View className="items-center mb-10">
            <Text className="text-4xl font-bold text-orange-500">Cook4U</Text>
            <Text className="text-gray-400 text-sm mt-1">Home-cooked meals, delivered</Text>
          </View>

          {/* Mode toggle */}
          <View className="flex-row bg-gray-100 rounded-2xl p-1 mb-6">
            {(['signin', 'signup'] as const).map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-xl items-center ${mode === m ? 'bg-white shadow-sm' : ''}`}
              >
                <Text className={`text-sm font-semibold ${mode === m ? 'text-gray-800' : 'text-gray-400'}`}>
                  {m === 'signin' ? 'Sign In' : 'Sign Up'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Role selector — signup only */}
          {mode === 'signup' && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">I am a...</Text>
              <View className="flex-row gap-3">
                {(['customer', 'chef'] as const).map(r => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setRole(r)}
                    className={`flex-1 py-3 rounded-2xl items-center border ${role === r ? 'bg-orange-500 border-orange-500' : 'bg-white border-gray-200'}`}
                  >
                    <Text className={`font-semibold text-sm ${role === r ? 'text-white' : 'text-gray-600'}`}>
                      {r === 'customer' ? '🍽️ Customer' : '👨‍🍳 Chef'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Fields */}
          {mode === 'signup' && (
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Full name"
              className="border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-900 mb-3"
              autoCapitalize="words"
            />
          )}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            className="border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-900 mb-3"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            className="border border-gray-200 rounded-2xl px-4 py-3.5 text-sm text-gray-900 mb-4"
          />

          {error ? <Text className="text-red-500 text-sm mb-3 text-center">{error}</Text> : null}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className="bg-orange-500 rounded-2xl py-4 items-center"
          >
            {loading ? <ActivityIndicator color="white" /> : (
              <Text className="text-white font-bold text-base">
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
