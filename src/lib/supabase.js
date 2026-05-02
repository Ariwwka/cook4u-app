import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const SUPABASE_URL = 'https://dnjbxljxkryejqrxkxdy.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuamJ4bGp4a3J5ZWpxcnhreGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzExNjksImV4cCI6MjA4OTI0NzE2OX0.AGI7Bx1CmneLQzDFyOguX0tQIsZwDmSDCmnnVyCqlu8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
