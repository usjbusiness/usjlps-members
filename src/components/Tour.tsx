// First-visit tour of the portal: spotlights the menu items one by one.
import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from './ui'

type Step = { target?: string; inMore?: boolean; icon: string; badge?: string; title: string; body: ReactNode }

export const TOUR_EVENT = 'lps-tour'
export const startTour = () => window.dispatchEvent(new Event(TOUR_EVENT))
const doneKey = (id: string) => `lps-tour-v1:${id}`

function steps(first: string): Step[] {
  return [
    { icon: 'sparkle', title: `Welcome to LPS, ${first}!`, body: <>Take a 1-minute tour to see everything your membership gives you — especially your <b>résumé</b>, your <b>points</b> and your own <b>professional page</b>.</> },
    { target: '/rank', inMore: true, icon: 'medal', badge: 'Points', title: 'Earn points at every event',
      body: <>Every event you attend = <b>1 sticker</b> (headliner events count ×2). Stickers unlock ranks with real rewards:<ul><li><b>Bronze · 3</b> — LPS lapel pin</li><li><b>Silver · 6</b> — LPS polo + certificate</li><li><b>Gold · 10</b> — priority seats with guests</li><li><b>Ivy · 15</b> — company trips & an e-board reference</li></ul></> },
    { target: '/resume', inMore: true, icon: 'resume', badge: 'Most valuable', title: 'Build a professional résumé in minutes',
      body: <>The <b>Résumé Builder</b> uses the USJ Career Center format. Fill in simple fields, watch it update live, then download <b>Word or PDF</b>. Your LPS role and attendance are added for you.</> },
    { target: '/people/me', inMore: true, icon: 'edit', badge: 'Like LinkedIn', title: 'Create your own professional page',
      body: <>Your page works like a LinkedIn profile: photo, header, About, experience, projects, skills, awards and your résumé. Other members see it in the directory.</> },
    { target: '/people/me', inMore: true, icon: 'share', title: 'Share your page anywhere',
      body: <>Turn on your <b>public link</b> — <span className="tour-url">members.usjlps.org/u/your-name</span> — and put it on LinkedIn, your résumé, email signature or Instagram bio. It comes with a <b>QR code</b>, and your rank shows as <b>Verified by USJ LPS</b>.</> },
    { target: '/certificate', inMore: true, icon: 'cert', title: 'Get the official LPS Certificate',
      body: <>Reach <b>Silver</b>, finish your résumé and make your page public (or add LinkedIn). The e-board issues a signed certificate with a <b>Credential ID</b> you can add to LinkedIn. Gold and Ivy get upgraded versions.</> },
    { target: '/watch', icon: 'live', title: 'Join meetings live',
      body: <>During meetings, follow the slides, answer polls and ask questions right from your phone. Missed one? Recordings are in the Library.</> },
    { target: '/people', icon: 'people', title: 'Meet the members',
      body: <>Find classmates and the e-board, see who is online and open their pages to connect.</> },
    { target: '/install', inMore: true, icon: 'phone', title: 'Put the portal on your phone',
      body: <>Add it to your home screen for one-tap access — it works like an app.</> },
    { icon: 'check', title: 'You are all set!', body: <>Best first steps:</> },
  ]
}

function visible(sel: string) {
  return [...document.querySelectorAll<HTMLElement>(sel)].find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' }) ?? null
}

export function Tour({ userId, firstName, setSheet }: { userId: string; firstName: string; setSheet: (v: boolean) => void }) {
  const [i, setI] = useState<number | null>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [vw, setVw] = useState(window.innerWidth)
  const nav = useNavigate()
  const list = steps(firstName || 'there')
  const step = i === null ? null : list[i]

  useEffect(() => {
    let t = 0
    try { if (!localStorage.getItem(doneKey(userId))) t = window.setTimeout(() => setI(0), 900) } catch { /* private mode */ }
    const open = () => setI(0)
    window.addEventListener(TOUR_EVENT, open)
    return () => { window.clearTimeout(t); window.removeEventListener(TOUR_EVENT, open) }
  }, [userId])

  const finish = useCallback(() => {
    try { localStorage.setItem(doneKey(userId), new Date().toISOString()) } catch { /* ignore */ }
    setI(null); setRect(null); setSheet(false)
  }, [userId, setSheet])

  // Find (and on phones, reveal) the menu item for this step, then keep its position fresh.
  useLayoutEffect(() => {
    if (!step) return
    const sel = step.target ? `[data-tour="${step.target}"]` : null
    if (!sel) { setRect(null); setSheet(false); return }
    let el = visible(sel)
    const sheetOpen = !!document.querySelector('.sheet')
    if (!el && step.inMore) setSheet(true)
    else if (el && !step.inMore && sheetOpen) setSheet(false)
    let alive = true
    const tick = () => {
      if (!alive) return
      el = visible(sel)
      if (el) {
        if (!el.dataset.tourScrolled) { el.scrollIntoView({ block: 'nearest' }); el.dataset.tourScrolled = '1' }
        const r = el.getBoundingClientRect()
        setRect((p) => (p && Math.abs(p.top - r.top) < 0.5 && Math.abs(p.left - r.left) < 0.5 && p.width === r.width ? p : r))
      } else setRect(null)
      setVw(window.innerWidth)
    }
    tick()
    const iv = window.setInterval(tick, 120)
    return () => { alive = false; window.clearInterval(iv); document.querySelectorAll<HTMLElement>('[data-tour-scrolled]').forEach((x) => delete x.dataset.tourScrolled) }
  }, [i]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (i === null) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') setI((x) => (x === null ? x : x < list.length - 1 ? x + 1 : (finish(), null)))
      else if (e.key === 'ArrowLeft') setI((x) => (x ? x - 1 : x))
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [i, finish, list.length])

  if (i === null || !step) return null
  const last = i === list.length - 1
  const vh = window.innerHeight
  const pad = 6
  const W = Math.min(370, vw - 24)
  let card: React.CSSProperties = { width: W }
  let arrow = ''
  if (rect) {
    if (rect.right < 300 && vw >= 1000) { card = { ...card, left: rect.right + 22, top: Math.max(12, Math.min(rect.top - 24, vh - 440)) }; arrow = 'left' }
    else {
      const left = Math.max(12, Math.min(rect.left + rect.width / 2 - W / 2, vw - W - 12))
      if (rect.top > vh / 2) { card = { ...card, left, bottom: vh - rect.top + 16 }; arrow = 'down' } else { card = { ...card, left, top: rect.bottom + 16 }; arrow = 'up' }
    }
  }
  const go = (to: string) => { finish(); nav(to) }

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-label="Portal tour">
      <div className="tour-block" onClick={(e) => e.stopPropagation()} />
      {rect ? <div className="tour-spot" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} /> : <div className="tour-dim" />}
      <div className={`tour-card${rect ? ` is-${arrow}` : ' is-center'}`} style={card} key={i}>
        <button className="tour-x" onClick={finish} aria-label="Close tour"><Icon name="close" size={16} /></button>
        <div className="tour-head"><span className="tour-ic"><Icon name={step.icon} size={20} /></span>{step.badge && <span className="tour-badge">{step.badge}</span>}</div>
        <h3>{step.title}</h3>
        <div className="tour-body">{step.body}</div>
        {last && (
          <div className="tour-cta">
            <button className="btn btn-gold btn-sm" onClick={() => go('/resume')}><Icon name="resume" size={15} />Start my résumé</button>
            <button className="btn btn-ghost btn-sm" onClick={() => go('/people/me')}><Icon name="edit" size={15} />Create my page</button>
            <button className="btn btn-ghost btn-sm" onClick={() => go('/rank')}><Icon name="medal" size={15} />See my points</button>
            <p className="muted small">Replay this tour anytime: <b>Portal tour</b> in the menu.</p>
          </div>
        )}
        <div className="tour-foot">
          <span className="tour-dots">{list.map((_, k) => <i key={k} className={k === i ? 'on' : k < i ? 'done' : ''} />)}</span>
          <span className="tour-btns">
            {i === 0 ? <button className="btn btn-ghost btn-sm" onClick={finish}>Skip for now</button> : <button className="btn btn-ghost btn-sm" onClick={() => setI(i - 1)}>Back</button>}
            <button className="btn btn-gold btn-sm" onClick={() => (last ? finish() : setI(i + 1))}>{i === 0 ? 'Show me around' : last ? 'Done' : 'Next'}{!last && <Icon name="arrow" size={14} />}</button>
          </span>
        </div>
      </div>
    </div>
  )
}
