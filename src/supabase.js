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

// Magic-link authentication uses the URL fragment for the session token.
// Force a query-based admin return route so it does not conflict with #/admin.
const originalSignInWithOtp = supabase.auth.signInWithOtp.bind(supabase.auth)
supabase.auth.signInWithOtp = (credentials) => {
  const adminRedirect = `${window.location.origin}${window.location.pathname}?admin=1`
  return originalSignInWithOtp({
    ...credentials,
    options: {
      ...(credentials?.options || {}),
      emailRedirectTo: adminRedirect,
      shouldCreateUser: false,
    },
  })
}
