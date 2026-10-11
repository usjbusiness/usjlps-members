import { createClient } from '@supabase/supabase-js'

// Public project URL and publishable key (safe to ship to the browser; RLS protects the data).
// Vercel environment variables override them if set.
const DEFAULT_URL = 'https://ftwjthakbeuitorrlkzf.supabase.co'
const DEFAULT_KEY = 'sb_publishable_DzVu1_EyoFnWQYfcPw0R4A_ZdNYOjno'
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || DEFAULT_URL
export const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || DEFAULT_KEY

/** "Keep me signed in": on = remember this device, off = sign out when the browser closes. */
const REMEMBER = 'lps-members-remember'
export const remember = {
  get: () => { try { return localStorage.getItem(REMEMBER) !== '0' } catch { return true } },
  set: (v: boolean) => { try { localStorage.setItem(REMEMBER, v ? '1' : '0') } catch { /* private mode */ } },
}
const storage = {
  getItem: (k: string) => { try { return localStorage.getItem(k) ?? sessionStorage.getItem(k) } catch { return null } },
  setItem: (k: string, v: string) => {
    try {
      if (remember.get()) { localStorage.setItem(k, v); sessionStorage.removeItem(k) } else { sessionStorage.setItem(k, v); localStorage.removeItem(k) }
    } catch { /* storage full or blocked */ }
  },
  removeItem: (k: string) => { try { localStorage.removeItem(k); sessionStorage.removeItem(k) } catch { /* ignore */ } },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { storage, storageKey: 'lps-members-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

/** Turns Supabase / Postgres / network errors into one readable sentence. */
export function friendly(e: unknown): string {
  const m = (e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e ?? '')).trim()
  if (!m) return 'Something went wrong. Please try again.'
  if (/failed to fetch|network|load failed/i.test(m)) return 'No connection. Check your internet and try again.'
  if (/jwt|token.*expired|not authenticated/i.test(m)) return 'Your session expired. Please sign in again.'
  if (/row-level security|permission denied/i.test(m)) return 'You do not have access to this.'
  if (/function .* does not exist|could not find the function|relation .* does not exist|could not find the table/i.test(m)) return 'This part of the portal is not set up yet. Ask the e-board to run the latest SQL update (LPS-STEP7.sql).'
  return m.replace(/^ERROR:\s*/i, '')
}
