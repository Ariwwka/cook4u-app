import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const SUPABASE_URL = 'https://dnjbxljxkryejqrxkxdy.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuamJ4bGp4a3J5ZWpxcnhreGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzExNjksImV4cCI6MjA4OTI0NzE2OX0.AGI7Bx1CmneLQzDFyOguX0tQIsZwDmSDCmnnVyCqlu8'

// SecureStore has a ~2KB limit per value on iOS.
// Supabase session tokens can exceed that, so we chunk large values.
const CHUNK_SIZE = 1800

const ChunkedSecureStore = {
  async getItem(key) {
    const safeKey = key.replace(/[^a-zA-Z0-9._-]/g, '_')
    try {
      const countStr = await SecureStore.getItemAsync(`${safeKey}__n`)
      if (countStr) {
        const count = parseInt(countStr, 10)
        let value = ''
        for (let i = 0; i < count; i++) {
          const chunk = await SecureStore.getItemAsync(`${safeKey}__${i}`)
          if (chunk == null) return null
          value += chunk
        }
        return value
      }
      return SecureStore.getItemAsync(safeKey)
    } catch {
      return null
    }
  },

  async setItem(key, value) {
    const safeKey = key.replace(/[^a-zA-Z0-9._-]/g, '_')
    try {
      if (value.length <= CHUNK_SIZE) {
        await SecureStore.setItemAsync(safeKey, value)
        await SecureStore.deleteItemAsync(`${safeKey}__n`)
      } else {
        const chunks = []
        for (let i = 0; i < value.length; i += CHUNK_SIZE) {
          chunks.push(value.slice(i, i + CHUNK_SIZE))
        }
        for (let i = 0; i < chunks.length; i++) {
          await SecureStore.setItemAsync(`${safeKey}__${i}`, chunks[i])
        }
        await SecureStore.setItemAsync(`${safeKey}__n`, String(chunks.length))
        // Remove unchunked key in case it existed before
        await SecureStore.deleteItemAsync(safeKey)
      }
    } catch (e) {
      console.warn('SecureStore setItem error:', e)
    }
  },

  async removeItem(key) {
    const safeKey = key.replace(/[^a-zA-Z0-9._-]/g, '_')
    try {
      await SecureStore.deleteItemAsync(safeKey)
      const countStr = await SecureStore.getItemAsync(`${safeKey}__n`)
      if (countStr) {
        const count = parseInt(countStr, 10)
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${safeKey}__${i}`)
        }
        await SecureStore.deleteItemAsync(`${safeKey}__n`)
      }
    } catch {
      // ignore
    }
  },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ChunkedSecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
