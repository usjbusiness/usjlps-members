import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { rankOf, useLiveNow, useMe } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { Avatar, Icon, Medal } from './ui'

export const MAIN = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/watch', label: 'Live & Library', short: 'Live', icon: 'live' },
  { to: '/news', label: 'Announcements', short: 'News', icon: 'news' },
  { to: '/people', label: 'Members', short: 'People', icon: 'people' },
]
export const MORE = [
  { to: '/events', label: 'Events', icon: 'calendar' },
  { to: '/notes', label: 'My Notes', icon: 'note' },
  { to: '/rank', label: 'Rank & Stickers', icon: 'medal' },
  { to: '/apparel', label: 'LPS Merch', icon: 'shirt' },
  { to: '/propose', label: 'Propose an Event', icon: 'bulb' },
  { to: '/record', label: 'My Record', icon: 'record' },
  { to: '/resume', label: 'Résumé Builder', icon: 'resume' },
  { to: '/install', label: 'Get the App', icon: 'phone' },
  { to: '/profile', label: 'My Profile', icon: 'user' },
]

/** Tells the directory you are online (about once a minute while the portal is open). */
function useHeartbeat() {
  useEffect(() => {
    const beat = () => { if (document.visibilityState === 'visible') void supabase.rpc('member_touch').then(() => undefined, () => undefined) }
    beat()
    const t = window.setInterval(beat, 60_000)
    document.addEventListener('visibilitychange', beat)
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', beat) }
  }, [])
}

export function Shell() {
  useHeartbeat()
  const { signOut } = useAuth()
  const me = useMe().data
  const live = useLiveNow().data
  const loc = useLocation()
  const [sheet, setSheet] = useState(false)
  useEffect(() => { setSheet(false); window.scrollTo(0, 0) }, [loc.pathname])
  const name = me?.member?.full_name ?? me?.board?.full_name ?? ''
  const r = rankOf(me?.total ?? 0)
  const groupme = me?.settings?.groupme_url
  const moreActive = MORE.some((m) => loc.pathname.startsWith(m.to))
  const isWatch = loc.pathname.startsWith('/watch')

  return (
    <div className={`shell${isWatch ? ' is-watch' : ''}`}>
      <aside className="side">
        <Link to="/" className="side-brand"><img src="/img/mono-gold.webp" alt="" /><span><strong>USJ LPS</strong><small>Member Portal</small></span></Link>
        <nav className="side-nav">
          {MAIN.map((n) => <NavLink key={n.to} to={n.to} end={n.end}><Icon name={n.icon} />{n.label}{n.to === '/watch' && live?.live && <b className="live-dot" title="Live now" />}</NavLink>)}
          <p className="side-sec">Society</p>
          {MORE.slice(0, 5).map((n) => <NavLink key={n.to} to={n.to}><Icon name={n.icon} />{n.label}</NavLink>)}
          <p className="side-sec">You</p>
          {MORE.slice(5).map((n) => <NavLink key={n.to} to={n.to}><Icon name={n.icon} />{n.label}</NavLink>)}
          {groupme && <a href={groupme} target="_blank" rel="noopener noreferrer"><Icon name="chat" />GroupMe Chat<Icon name="ext" size={13} className="ext" /></a>}
        </nav>
        <Link to="/profile" className="side-me">
          <Avatar name={name} path={me?.board?.avatar_url} size={38} />
          <span><strong>{name}</strong><small><Medal rank={r.rank.key} size={12} /> {r.rank.name} · {me?.total ?? 0} stickers</small></span>
        </Link>
      </aside>

      <header className="top">
        <Link to="/" className="top-brand"><img src="/img/mono-gold.webp" alt="" /><span>USJ <b>LPS</b></span></Link>
        {live?.live && <Link to="/watch" className="top-live"><b className="live-dot" />Live now</Link>}
        <Link to="/profile" className="top-me" aria-label="My profile"><Avatar name={name} path={me?.board?.avatar_url} size={34} /></Link>
      </header>

      <main className="main"><Outlet /></main>

      <nav className="tabs" aria-label="Main">
        {MAIN.map((n) => <NavLink key={n.to} to={n.to} end={n.end}><span className="tab-ic"><Icon name={n.icon} size={22} />{n.to === '/watch' && live?.live && <b className="live-dot" />}</span>{n.short ?? n.label}</NavLink>)}
        <button className={moreActive || sheet ? 'active' : ''} onClick={() => setSheet(true)}><span className="tab-ic"><Icon name="more" size={22} /></span>More</button>
      </nav>

      {sheet && (
        <div className="sheet-wrap" onClick={() => setSheet(false)}>
          <div className="sheet" role="dialog" aria-label="More" onClick={(e) => e.stopPropagation()}>
            <span className="sheet-grip" />
            <div className="sheet-grid">
              {MORE.map((n) => <NavLink key={n.to} to={n.to}><Icon name={n.icon} size={22} /><span>{n.label}</span></NavLink>)}
              {groupme && <a href={groupme} target="_blank" rel="noopener noreferrer"><Icon name="chat" size={22} /><span>GroupMe Chat</span></a>}
              <a href="https://www.instagram.com/usjlps" target="_blank" rel="noopener noreferrer"><Icon name="insta" size={22} /><span>@usjlps</span></a>
            </div>
            <button className="btn btn-ghost btn-block" onClick={() => signOut()}><Icon name="out" size={18} />Sign out</button>
          </div>
        </div>
      )}
    </div>
  )
}
