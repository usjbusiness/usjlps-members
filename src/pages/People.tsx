import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MAJOR_ROLE, ROLE_COLOR, isOnline, rankOf, seenLabel, useDirectory, type Person } from '@/lib/api'
import { Avatar, Empty, ErrorBox, Icon, Medal, PageHead, Spinner } from '@/components/ui'

const GROUPS = [
  { kind: 'advisor', label: 'Advisors', sub: 'Faculty and staff who guide the Society' },
  { kind: 'eboard', label: 'Executive Board', sub: 'The student officers who run LPS' },
  { kind: 'major', label: 'Major Leaders', sub: 'Teams that build programs for every major' },
  { kind: 'member', label: 'Members', sub: 'Everyone in the Society' },
] as const
const RANK = { advisor: 0, eboard: 1, major: 2, member: 3 } as const

interface Card { key: string; kind: Person['kind']; name: string; badges: { label: string; color: string; dashed?: boolean }[]; major: string | null; year: number | null; email: string | null; avatar: string | null; headline: string | null; linkedin: string | null; interests: string[]; sort: number; me: boolean; seen: string | null; total: number }

export type { Card }
export function merge(rows: Person[]): Card[] {
  const map = new Map<string, Card>()
  for (const p of rows) {
    const badge = p.kind === 'member' ? { label: 'Member', color: '#8a8478' }
      : p.kind === 'major' ? { label: `${MAJOR_ROLE[p.role ?? ''] ?? 'Major Team'}${p.major ? ` · ${p.major}` : ''}`, color: ROLE_COLOR.major_lead, dashed: true }
      : { label: p.title || 'E-Board', color: ROLE_COLOR[p.role ?? ''] ?? '#C9A54C' }
    const c = map.get(p.person_key)
    if (!c) {
      map.set(p.person_key, { key: p.person_key, kind: p.kind, name: p.full_name, badges: [badge], major: p.major, year: p.grad_year, email: p.email, avatar: p.avatar_url, headline: p.headline, linkedin: p.linkedin_url, interests: p.interests ?? [], sort: p.sort, me: p.is_me, seen: p.last_seen_at, total: p.total ?? 0 })
    } else {
      if (RANK[p.kind] < RANK[c.kind]) { c.kind = p.kind; c.sort = p.sort; c.badges.unshift(badge) } else if (p.kind !== 'member') c.badges.push(badge)
      c.email ??= p.email; c.avatar ??= p.avatar_url; c.headline ??= p.headline; c.linkedin ??= p.linkedin_url; c.major ??= p.major; c.year ??= p.grad_year; c.me ||= p.is_me
      if (p.last_seen_at && (!c.seen || p.last_seen_at > c.seen)) c.seen = p.last_seen_at
      if (!c.interests.length) c.interests = p.interests ?? []
      c.total = Math.max(c.total, p.total ?? 0)
    }
  }
  for (const c of map.values()) if (c.kind !== 'member') c.badges = c.badges.filter((b) => b.label !== 'Member')
  return [...map.values()]
}

/** Rank badge (medal + name), shown on cards and member pages. */
export function RankChip({ total, big }: { total: number; big?: boolean }) {
  const r = rankOf(total).rank
  return <span className={`rank-chip r-${r.key}${big ? ' is-big' : ''}`} title={`${r.name} · ${total} sticker${total === 1 ? '' : 's'}`}><Medal rank={r.key} size={big ? 18 : 13} />{r.name}</span>
}
export const showsRank = (c: Pick<Card, 'kind' | 'total'>) => c.kind !== 'advisor' || c.total > 0

function PersonCard({ c }: { c: Card }) {
  const on = !c.me && isOnline(c.seen)
  const label = c.me ? null : seenLabel(c.seen)
  return (
    <article className={`person kind-${c.kind}${c.me ? ' is-me' : ''}`}>
      <Link to={`/people/${c.me ? 'me' : c.key}`} className="person-open" aria-label={`Open ${c.name}'s page`}>
      <Avatar name={c.name} path={c.avatar} size={c.kind === 'member' ? 46 : 58} ring={c.badges[0]?.color} online={on} />
      <div className="person-main">
        <strong>{c.name}{c.me && <em className="you">You</em>}</strong>
        <div className="badges">{showsRank(c) && <RankChip total={c.total} />}{c.badges.filter((b) => !showsRank(c) || b.label !== 'Member').map((b) => <span key={b.label} className={`role${b.dashed ? ' is-dashed' : ''}`} style={{ ['--rc' as string]: b.color }}><i />{b.label}</span>)}</div>
        <small>{[c.major, c.year ? `Class of ${c.year}` : null].filter(Boolean).join(' · ')}</small>
        {c.headline && <p className="person-head">{c.headline}</p>}
        {label && <p className={`seen${on ? ' is-on' : ''}`}><i />{label}</p>}
      </div>
      </Link>
      <div className="person-links">
        {c.email && <a href={`mailto:${c.email}`} aria-label={`Email ${c.name}`} title={c.email}><Icon name="mail" size={18} /></a>}
        {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" aria-label={`${c.name} on LinkedIn`}><Icon name="linkedin" size={18} /></a>}
      </div>
    </article>
  )
}

export function People() {
  const q = useDirectory()
  const [kind, setKind] = useState<string>('all')
  const [major, setMajor] = useState('')
  const [search, setSearch] = useState('')
  const cards = useMemo(() => merge(q.data ?? []), [q.data])
  const majors = useMemo(() => [...new Set(cards.map((c) => c.major).filter(Boolean) as string[])].sort(), [cards])
  const s = search.trim().toLowerCase()
  const onlineCount = cards.filter((c) => !c.me && isOnline(c.seen)).length
  const shown = cards.filter((c) => (kind === 'all' || (kind === 'online' ? !c.me && isOnline(c.seen) : c.kind === kind)) && (!major || c.major === major)
    && (!s || `${c.name} ${c.major ?? ''} ${c.badges.filter((b) => !showsRank(c) || b.label !== 'Member').map((b) => b.label).join(' ')} ${c.headline ?? ''} ${c.interests.join(' ')}`.toLowerCase().includes(s)))
  const count = (k: string) => cards.filter((c) => c.kind === k).length
  return (
    <div className="page">
      <PageHead eyebrow="Directory" title="Members" sub={<>{cards.length} people in the Society. Tap anyone to open their page. <Link to="/people/me">Edit my page</Link></>} />
      <div className="filters">
        <label className="search"><Icon name="search" size={17} /><input type="search" placeholder="Search name, major, role or interest" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
        <select value={major} onChange={(e) => setMajor(e.target.value)} aria-label="Major"><option value="">All majors</option>{majors.map((m) => <option key={m}>{m}</option>)}</select>
      </div>
      <div className="chips-row">
        {[{ kind: 'all', label: 'Everyone' }, ...GROUPS].map((g) => <button key={g.kind} className={`fchip${kind === g.kind ? ' on' : ''}`} onClick={() => setKind(g.kind)}>{g.label}{g.kind !== 'all' && <span>{count(g.kind)}</span>}</button>)}
        {onlineCount > 0 && <button className={`fchip fchip-on${kind === 'online' ? ' on' : ''}`} onClick={() => setKind('online')}><i className="dot-on" />Online now<span>{onlineCount}</span></button>}
      </div>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} retry={() => q.refetch()} /> : !shown.length ? <Empty icon="people" title="Nobody matches" body="Try another name or clear the filters." /> : (
        GROUPS.filter((g) => kind === 'all' || kind === 'online' || g.kind === kind).map((g) => {
          const list = shown.filter((c) => c.kind === g.kind).sort((a, b) => (g.kind === 'member' ? Number(isOnline(b.seen)) - Number(isOnline(a.seen)) : 0) || a.sort - b.sort || a.name.localeCompare(b.name))
          if (!list.length) return null
          return (
            <section key={g.kind} className="dir-group">
              <div className="dir-head"><h2>{g.label}</h2><span>{g.sub}</span></div>
              <div className={`people-grid${g.kind === 'member' ? ' is-dense' : ''}`}>{list.map((c) => <PersonCard key={c.key} c={c} />)}</div>
            </section>
          )
        })
      )}
    </div>
  )
}
