import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not configured. Data-backed features will be disabled.')
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null
