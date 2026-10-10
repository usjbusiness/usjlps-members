import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '@/lib/auth'
import { remember } from '@/lib/supabase'
import { Net } from '@/components/Net'
import { Icon } from '@/components/ui'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const mask = (e: string) => e.replace(/^(.)(.*)(@.*)$/, (_m, a: string, b: string, c: string) => `${a}${'•'.repeat(Math.min(6, Math.max(2, b.length)))}${c}`)

export function Login() {
  const { sendCode, verifyCode, notice, setNotice } = useAuth()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState(() => localStorage.getItem('lps-members-email') ?? '')
  const [code, setCode] = useState('')
  const [len, setLen] = useState(6)
  const [keep, setKeep] = useState(remember.get())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [wait, setWait] = useState(0)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t) }, [wait])
  useEffect(() => { if (step === 'code') setTimeout(() => codeRef.current?.focus(), 60) }, [step])

  const send = async (e?: FormEvent) => {
    e?.preventDefault(); setErr(null); setNotice(null)
    const v = email.trim().toLowerCase()
    if (!EMAIL.test(v)) { setErr('Enter your email address, for example jdoe@usj.edu.'); return }
    setBusy(true)
    try {
      const r = await sendCode(v)
      localStorage.setItem('lps-members-email', v)
      setLen(r.length >= 6 && r.length <= 10 ? r.length : 6); setCode(''); setStep('code'); setWait(45)
    } catch (x) { setErr((x as Error).message) } finally { setBusy(false) }
  }
  const verify = async (e?: FormEvent, value = code) => {
    e?.preventDefault(); setErr(null)
    const digits = value.replace(/\D/g, '')
    if (digits.length < 6) { setErr(`Enter the ${len}-digit code from the email.`); return }
    setBusy(true)
    remember.set(keep)
    try { await verifyCode(email, digits) } catch (x) { setErr((x as Error).message); setBusy(false) }
  }
  const onCode = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, len); setCode(d)
    if (d.length === len && !busy) verify(undefined, d)
  }

  return (
    <div className="login">
      <Net className="login-net" />
      <div className="login-glow" aria-hidden="true" />
      <img className="login-wings" src="/img/wings-gold.webp" alt="" aria-hidden="true" />
      <div className="login-card">
        <span className="login-edge" aria-hidden="true" />
        <img className="login-mono" src="/img/mono-gold.webp" alt="USJ Leadership & Professional Society" />
        <p className="eyebrow">Member Portal</p>
        {step === 'email' ? (
          <form onSubmit={send} noValidate>
            <h1>Welcome <em>back.</em></h1>
            <p className="login-sub">Sign in with the USJ email you used to join. We will email you a one-time code, so there is no password to remember.</p>
            {notice && <p className="login-note" role="status">{notice}</p>}
            <label className="fld"><span>USJ email</span>
              <input type="email" inputMode="email" autoComplete="username email" autoCapitalize="none" spellCheck={false} placeholder="jdoe@usj.edu"
                value={email} onChange={(e) => setEmail(e.target.value)} autoFocus={!email} />
            </label>
            <label className="check"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /><span>Keep me signed in on this device</span></label>
            {err && <p className="form-err" role="alert">{err}</p>}
            <button className="btn btn-gold btn-block btn-lg" disabled={busy}>{busy ? 'Sending your code…' : 'Email me a code'}<Icon name="arrow" size={18} /></button>
          </form>
        ) : (
          <form onSubmit={verify} noValidate>
            <h1>Check your <em>email.</em></h1>
            <p className="login-sub">We sent a {len}-digit code to <strong>{mask(email)}</strong>. It can take a minute. Check Junk or Quarantine if you do not see it.</p>
            <label className="fld"><span>Sign-in code</span>
              <input ref={codeRef} className="code-input" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={len}
                placeholder={'•'.repeat(len)} value={code} onChange={(e) => onCode(e.target.value)} aria-label="Sign-in code" />
            </label>
            <label className="check"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /><span>Keep me signed in on this device</span></label>
            {err && <p className="form-err" role="alert">{err}</p>}
            <button className="btn btn-gold btn-block btn-lg" disabled={busy}>{busy ? 'Signing you in…' : 'Sign in'}<Icon name="arrow" size={18} /></button>
            <div className="login-row">
              <button type="button" className="link" onClick={() => { setStep('email'); setErr(null) }}><Icon name="back" size={14} />Different email</button>
              <button type="button" className="link" disabled={wait > 0 || busy} onClick={() => send()}>{wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}</button>
            </div>
          </form>
        )}
        <p className="login-foot">Not a member yet? <a href="https://usjlps.org/join">Apply at usjlps.org/join</a></p>
      </div>
      <p className="login-legal">USJ Leadership &amp; Professional Society · University of Saint Joseph</p>
    </div>
  )
}
