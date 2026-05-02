import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

export default function SignUpScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const [role, setRole] = useState('customer')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [dob, setDob] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.')
      return
    }
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            role,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            phone: phone.trim(),
            date_of_birth: dob.trim(),
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#1C1C1E" />
        </TouchableOpacity>

        <View style={styles.titleSection}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join thousands of food lovers</Text>
        </View>

        <Text style={styles.sectionLabel}>I am a...</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleCard, role === 'customer' && styles.roleCardSelected]}
            onPress={() => setRole('customer')}
            activeOpacity={0.7}
          >
            <Text style={styles.roleEmoji}>🛒</Text>
            <Text style={[styles.roleText, role === 'customer' && styles.roleTextSelected]}>
              Customer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleCard, role === 'chef' && styles.roleCardSelected]}
            onPress={() => setRole('chef')}
            activeOpacity={0.7}
          >
            <Text style={styles.roleEmoji}>👨‍🍳</Text>
            <Text style={[styles.roleText, role === 'chef' && styles.roleTextSelected]}>
              Chef
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            placeholderTextColor="#9CA3AF"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Last Name"
            placeholderTextColor="#9CA3AF"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.inputWithIcon]}
              placeholder="Password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Date of Birth (DD/MM/YYYY)"
            placeholderTextColor="#9CA3AF"
            value={dob}
            onChangeText={setDob}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor="#9CA3AF"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          {role === 'customer' && (
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Delivery address"
              placeholderTextColor="#9CA3AF"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />
          )}

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
            </Text>
          </TouchableOpacity>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleSignUp}
            activeOpacity={0.7}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.createButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkText}>
              Already have an account?{' '}
              <Text style={styles.loginLinkHighlight}>Log In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  roleCardSelected: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  roleEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleTextSelected: {
    color: '#F97316',
  },
  form: {
    gap: 14,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1C1C1E',
    backgroundColor: '#FFFFFF',
  },
  inputWithIcon: {
    paddingRight: 48,
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  termsLink: {
    color: '#F97316',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
  },
  createButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  loginLink: {
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 15,
    color: '#6B7280',
  },
  loginLinkHighlight: {
    color: '#F97316',
    fontWeight: '600',
  },
})
