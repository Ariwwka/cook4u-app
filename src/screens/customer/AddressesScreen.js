import React, { useState, useCallback, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

export default function AddressesScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)

  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [postcode, setPostcode] = useState('')

  const fetchAddresses = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', user.id)
        .order('is_default', { ascending: false })
      if (!error) setAddresses(data || [])
    } catch {}
    finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { fetchAddresses() }, [fetchAddresses])

  async function handleSetDefault(id) {
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', user.id)
    await supabase
      .from('customer_addresses')
      .update({ is_default: true })
      .eq('id', id)
    fetchAddresses()
  }

  async function handleDelete(id) {
    Alert.alert('Delete Address', 'Are you sure you want to remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('customer_addresses').delete().eq('id', id)
          fetchAddresses()
        },
      },
    ])
  }

  async function handleAdd() {
    if (!line1.trim() || !city.trim() || !postcode.trim()) {
      Alert.alert('Required', 'Please fill in address line 1, city, and postcode.')
      return
    }
    setSaving(true)
    try {
      const isFirst = addresses.length === 0
      const { error } = await supabase.from('customer_addresses').insert({
        customer_id: user.id,
        line1: line1.trim(),
        line2: line2.trim() || null,
        city: city.trim(),
        postcode: postcode.trim(),
        country: 'United Kingdom',
        is_default: isFirst,
      })
      if (error) {
        Alert.alert('Error', 'Could not save address.')
      } else {
        setLine1(''); setLine2(''); setCity(''); setPostcode('')
        setShowAddModal(false)
        fetchAddresses()
      }
    } catch {
      Alert.alert('Error', 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  function renderAddress({ item }) {
    return (
      <View style={styles.addressCard}>
        <View style={styles.addressCardLeft}>
          <View style={styles.addressIconBox}>
            <Ionicons name="location-outline" size={20} color="#F97316" />
          </View>
          <View style={styles.addressInfo}>
            <Text style={styles.addressLine}>{item.line1}</Text>
            {item.line2 ? <Text style={styles.addressSubLine}>{item.line2}</Text> : null}
            <Text style={styles.addressSubLine}>{item.city}, {item.postcode}</Text>
            {item.is_default && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.addressActions}>
          {!item.is_default && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSetDefault(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color="#F97316" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#1C1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <TouchableOpacity
          style={styles.addButtonHeader}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={26} color="#F97316" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#F97316" size="large" />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          renderItem={renderAddress}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📍</Text>
              <Text style={styles.emptyText}>No addresses saved</Text>
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.addFirstButtonText}>Add Address</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalContainer, { paddingTop: insets.top + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Address</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={26} color="#1C1C1E" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
              {[
                { label: 'Address Line 1 *', value: line1, setter: setLine1, placeholder: 'Street address', keyboard: 'default' },
                { label: 'Flat / Apartment', value: line2, setter: setLine2, placeholder: 'Optional', keyboard: 'default' },
                { label: 'City *', value: city, setter: setCity, placeholder: 'London', keyboard: 'default' },
                { label: 'Postcode *', value: postcode, setter: setPostcode, placeholder: 'SW1A 1AA', keyboard: 'default' },
              ].map((field) => (
                <View key={field.label} style={styles.fieldGroup}>
                  <Text style={styles.label}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={field.value}
                    onChangeText={field.setter}
                    placeholder={field.placeholder}
                    placeholderTextColor="#9CA3AF"
                    keyboardType={field.keyboard}
                    autoCapitalize="words"
                  />
                </View>
              ))}

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleAdd}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Address</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#1C1C1E', textAlign: 'center' },
  addButtonHeader: { width: 36, height: 36, alignItems: 'flex-end', justifyContent: 'center' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 20, paddingTop: 16 },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addressCardLeft: { flexDirection: 'row', flex: 1 },
  addressIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  addressInfo: { flex: 1 },
  addressLine: { fontSize: 15, fontWeight: '600', color: '#1C1C1E', marginBottom: 2 },
  addressSubLine: { fontSize: 13, color: '#6B7280' },
  defaultBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  defaultBadgeText: { fontSize: 11, fontWeight: '600', color: '#F97316' },
  addressActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 8 },
  actionButton: { padding: 4 },
  emptyContainer: { paddingTop: 80, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#1C1C1E', marginBottom: 24 },
  addFirstButton: {
    height: 50,
    paddingHorizontal: 32,
    backgroundColor: '#F97316',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFirstButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  modalContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1E' },
  modalContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  fieldGroup: { marginBottom: 18 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1C1C1E',
    backgroundColor: '#FAFAFA',
  },
  saveButton: {
    height: 54,
    backgroundColor: '#F97316',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
})
