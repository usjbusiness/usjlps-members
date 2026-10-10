import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { SUPABASE_KEY, SUPABASE_URL, supabase } from './supabase'

type Status = 'loading' | 'signed-out' | 'signed-in'
interface AuthCtx {
  status: Status
  session: Session | null
  notice: string | null
  setNotice: (s: string | null) => void
  sendCode: (email: string) => Promise<{ firstName: string; length: number }>
  verifyCode: (email: string, code: string) => Promise<void>
  signOut: (notice?: string) => Promise<void>
}
const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setStatus(data.session ? 'signed-in' : 'signed-out') })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setStatus(s ? 'signed-in' : 'signed-out') })
    return () => sub.subscription.unsubscribe()
  }, [])

  const sendCode = useCallback(async (email: string) => {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 25000)
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/member-login`, {
        method: 'POST', signal: ctl.signal,
        headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || (res.status === 404 ? 'The sign-in service is not set up yet. Ask the e-board to deploy member-login.' : 'The code could not be sent. Please try again.'))
      return { firstName: String(body.first_name ?? ''), length: Number(body.length ?? 6) }
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw new Error('This is taking too long. Check your connection and try again.')
      if (/failed to fetch|load failed|networkerror/i.test((e as Error).message)) throw new Error('No connection to the sign-in service. Check your internet and try again.')
      throw e
    } finally { clearTimeout(t) }
  }, [])

  const verifyCode = useCallback(async (email: string, code: string) => {
    const token = code.replace(/\D/g, '')
    let { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'email' })
    if (error && /invalid|expired/i.test(error.message)) {
      const r = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'magiclink' })
      error = r.error
    }
    if (error) throw new Error(/expired|invalid/i.test(error.message) ? 'This code is wrong or has expired. Check the latest email or send a new code.' : error.message)
    qc.removeQueries()
  }, [qc])

  const signOut = useCallback(async (n?: string) => {
    await supabase.auth.signOut().catch(() => undefined)
    qc.clear()
    setNotice(n ?? null)
  }, [qc])

  const value = useMemo(() => ({ status, session, notice, setNotice, sendCode, verifyCode, signOut }), [status, session, notice, sendCode, verifyCode, signOut])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside provider')
  return v
}
