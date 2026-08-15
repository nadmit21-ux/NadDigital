import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ugyrgvbfwvmuhsjmjtue.supabase.co'
const supabasePublishableKey = 'sb_publishable_qHIobQFTgOOrzBttJazZQA_e5-MvmLK'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
