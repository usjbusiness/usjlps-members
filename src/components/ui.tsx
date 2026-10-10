import { createContext, useCallback, useContext, useState, type ReactNode, type SVGProps } from 'react'
import { useAvatar } from '@/lib/api'
import { initials } from '@/lib/format'
import { friendly } from '@/lib/supabase'

// ---- Icons (1.6px line icons) ------------------------------------------
const P: Record<string, ReactNode> = {
  home: <><path d="M3.5 10.5 12 4l8.5 6.5" /><path d="M5.5 9.5V20h13V9.5" /><path d="M10 20v-5.5h4V20" /></>,
  live: <><rect x="2.5" y="5" width="19" height="12.5" rx="2" /><path d="M8 21h8M12 17.5V21" /><circle cx="12" cy="11.2" r="2.3" fill="currentColor" stroke="none" /></>,
  news: <><path d="M4 9.5v5l3 .5 9 4.5V4.5L7 9 4 9.5Z" /><path d="M7 15l1.2 5" /><path d="M19 9.5a3 3 0 0 1 0 5" /></>,
  people: <><circle cx="9" cy="8.5" r="3.2" /><path d="M3 19.5c.6-3.2 3-5 6-5s5.4 1.8 6 5" /><circle cx="17" cy="9.5" r="2.4" /><path d="M16.5 14.6c2.3.2 4 1.7 4.5 4.4" /></>,
  more: <><circle cx="5.5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="18.5" cy="12" r="1.4" fill="currentColor" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>,
  medal: <><circle cx="12" cy="14.5" r="5.5" /><path d="M8.5 10 6 3h4l2 5M15.5 10 18 3h-4l-2 5" /><path d="m12 12 .9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3Z" /></>,
  shirt: <><path d="M8.5 3.5 3 6.5l2 4.5 2.5-1V20.5h9V10l2.5 1 2-4.5-5.5-3a3.5 3.5 0 0 1-7 0Z" /></>,
  bulb: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.4 1.1 2.2h5c0-.8.4-1.6 1.1-2.2A6 6 0 0 0 12 3Z" /></>,
  phone: <><rect x="6.5" y="2.5" width="11" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></>,
  user: <><circle cx="12" cy="8.5" r="4" /><path d="M4 20.5c.9-4 4-6 8-6s7.1 2 8 6" /></>,
  out: <><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  chat: <><path d="M4 5.5h16v10H9.5L5 19.5v-4H4Z" /><path d="M8 10.5h8" /></>,
  insta: <><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></>,
  ext: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m3.5 7 8.5 6 8.5-6" /></>,
  linkedin: <><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M8 10.5V16M8 7.6v.1M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.4-2.6s2.1.9 2.1 2.6V16" /></>,
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  share: <><path d="M12 3.5v11M8 7.5l4-4 4 4" /><path d="M7 11H5.5v9.5h13V11H17" /></>,
  addsq: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8.5v7M8.5 12h7" /></>,
  dots: <><circle cx="12" cy="5.5" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="18.5" r="1.4" fill="currentColor" /></>,
  download: <><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" /><path d="M4.5 19.5h15" /></>,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  back: <path d="M19 12H5M11 6l-6 6 6 6" />,
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8Z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  board: <><rect x="3.5" y="4.5" width="17" height="12" rx="1.5" /><path d="M8 20.5l4-4 4 4M7.5 9.5h9M7.5 12.5h5" /></>,
}
export type IconName = keyof typeof P
export function Icon({ name, size = 20, ...rest }: { name: string; size?: number } & SVGProps<SVGSVGElement>) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{P[name]}</svg>
}

export function Avatar({ name, path, size = 44, ring }: { name: string; path?: string | null; size?: number; ring?: string }) {
  const src = useAvatar(path).data
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36, ...(ring ? { ['--ring' as string]: ring } : {}) }}>
      {src ? <img src={src} alt="" loading="lazy" /> : <span>{initials(name)}</span>}
    </span>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <div className="spinner" role="status"><span className="spinner-ring" />{label}</div>
}
export function Empty({ icon = 'star', title, body, action }: { icon?: string; title: string; body?: ReactNode; action?: ReactNode }) {
  return <div className="empty"><span className="empty-ic"><Icon name={icon} size={22} /></span><strong>{title}</strong>{body && <p>{body}</p>}{action}</div>
}
export function ErrorBox({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div className="errbox" role="alert"><p>{friendly(error)}</p>{retry && <button className="btn btn-ghost btn-sm" onClick={retry}>Try again</button>}</div>
}

export function PageHead({ eyebrow, title, sub, actions }: { eyebrow?: string; title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="phead">
      <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{sub && <p className="phead-sub">{sub}</p>}</div>
      {actions && <div className="phead-actions">{actions}</div>}
    </header>
  )
}

const MEDAL: Record<string, [string, string, string]> = {
  member: ['#3a3a3a', '#F3EDE2', '#8a8478'],
  bronze: ['#5a3720', '#E8B98E', '#B07A4C'],
  silver: ['#3d4248', '#EEF1F5', '#A9B0B9'],
  gold: ['#5a4515', '#FFF1C2', '#C9A54C'],
  ivy: ['#0d2c22', '#E9D49A', '#2E7D5B'],
}
/** Hexagon medal for a rank (matches the LPS crest). */
export function Medal({ rank, size = 64, locked }: { rank: string; size?: number; locked?: boolean }) {
  const [dark, light, mid] = MEDAL[rank] ?? MEDAL.member
  const id = `m-${rank}-${size}`
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 100 112" className={`medal${locked ? ' is-locked' : ''}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={light} /><stop offset=".45" stopColor={mid} /><stop offset="1" stopColor={dark} /></linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M50 3 94 28v56L50 109 6 84V28Z" fill={`url(#${id}-g)`} />
      <path d="M50 11 87 32v48L50 101 13 80V32Z" fill="none" stroke={dark} strokeOpacity=".55" strokeWidth="1.5" />
      <path d="M50 3 94 28v28H6V28Z" fill={`url(#${id}-s)`} />
      <text x="50" y="66" textAnchor="middle" fontFamily="'Cormorant Garamond', Georgia, serif" fontSize="34" fontWeight="600" fill={dark} fillOpacity=".85">{rank === 'member' ? 'M' : rank[0].toUpperCase()}</text>
    </svg>
  )
}

// ---- Toasts ------------------------------------------------------------
type T = { id: number; ok: boolean; text: string }
const ToastCtx = createContext<{ ok: (t: string) => void; error: (e: unknown) => void } | null>(null)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([])
  const push = useCallback((ok: boolean, text: string) => {
    const id = Date.now() + Math.random()
    setItems((x) => [...x, { id, ok, text }])
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), ok ? 3200 : 7000)
  }, [])
  const api = { ok: (t: string) => push(true, t), error: (e: unknown) => push(false, typeof e === 'string' ? e : friendly(e)) }
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite">{items.map((t) => <div key={t.id} className={`toast ${t.ok ? 'is-ok' : 'is-err'}`} role={t.ok ? 'status' : 'alert'}>{t.ok && <Icon name="check" size={16} />}{t.text}</div>)}</div>
    </ToastCtx.Provider>
  )
}
export function useToast() {
  const v = useContext(ToastCtx)
  if (!v) throw new Error('useToast outside provider')
  return v
}
