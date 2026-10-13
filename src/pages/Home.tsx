import { EventStatus } from '@/components/EventStatus'
import { Link } from 'react-router-dom'
import { isOnline, rankOf, useDirectory, useEvents, useLiveNow, useMe, usePolls, usePosts, type Me } from '@/lib/api'
import { fmtDate, fmtTime, fmtWhen, firstName, greeting } from '@/lib/format'
import { Avatar, Icon, Medal } from '@/components/ui'
import { Net } from '@/components/Net'
import { InterestsPicker, PollCard } from '@/components/Polls'
import { seenPosts } from './News'

export function MemberCard({ me }: { me: Me }) {
  const r = rankOf(me.total)
  const name = me.member?.full_name ?? me.board?.full_name ?? ''
  const since = me.member?.date_joined ?? null
  const no = (me.member?.id ?? me.board?.id ?? '').replace(/-/g, '').slice(0, 6).toUpperCase()
  const role = me.board?.position_title ?? (me.major_roles[0] ? `${me.major_roles[0].major} Major Team` : 'Member')
  return (
    <div className={`mcard rank-${r.rank.key}`}>
      <span className="mcard-sheen" aria-hidden="true" />
      <div className="mcard-top">
        <img src="/img/mono-gold.webp" alt="" />
        <div><strong>USJ Leadership &amp; Professional Society</strong><small>Skills · Network · Leadership</small></div>
      </div>
      <div className="mcard-row"><div className="mcard-name">{name}</div><div className="mcard-no">LPS · {no}</div></div>
      <div className="mcard-meta">
        <div><small>Role</small><b>{role}</b></div>
        <div><small>Member since</small><b>{since ? fmtDate(since, { month: 'short', year: 'numeric' }) : 'Founding'}</b></div>
        <div><small>Rank</small><b className="mcard-rank"><Medal rank={r.rank.key} size={13} />{r.rank.name}</b></div>
      </div>
    </div>
  )
}

function HomePolls({ me }: { me: Me }) {
  const polls = usePolls().data ?? []
  const todo = polls.filter((p) => p.is_open && !(p.my_choices?.length || p.my_other))
  const show = todo[0] ?? polls.find((p) => p.is_open)
  const needInterests = !!me.member && !(me.member.interests?.length)
  if (!show && !needInterests) return null
  return (
    <div className="home-grid home-voice">
      {show && <section className="panel span2 pollpanel">
        <div className="panel-head"><h2>{todo.length ? 'Quick poll' : 'Latest poll'}</h2><Link to="/polls" className="more">{todo.length > 1 ? `${todo.length - 1} more` : 'All polls'}<Icon name="arrow" size={14} /></Link></div>
        <PollCard key={show.id} poll={show} compact />
      </section>}
      {needInterests && <section className="panel span2">
        <div className="panel-head"><h2>What interests you?</h2></div>
        <p className="muted small">Pick everything you want from LPS. The e-board plans sessions and guests around what members choose.</p>
        <InterestsPicker value={[]} />
      </section>}
    </div>
  )
}

export function Home() {
  const me = useMe().data!
  const posts = usePosts().data ?? []
  const events = useEvents().data ?? []
  const live = useLiveNow().data
  const r = rankOf(me.total)
  const name = me.member?.full_name ?? me.board?.full_name ?? ''
  const now = Date.now()
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() > now - 3 * 3600e3 && !['cancelled','completed'].includes(e.status)).sort((a, b) => a.starts_at.localeCompare(b.starts_at)).slice(0, 3)
  const seen = seenPosts()
  const groupme = me.settings?.groupme_url
  const people = useDirectory().data ?? []
  const online = [...new Map(people.filter((p) => !p.is_me && isOnline(p.last_seen_at)).map((p) => [p.person_key, p])).values()]

  return (
    <div className="page home">
      <section className="hero">
        <Net className="hero-net" density={.7} />
        <div className="hero-txt">
          <p className="eyebrow">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1>{greeting()},<br /><em>{firstName(name)}.</em></h1>
          <p className="hero-sub">{r.next ? <>You are <b>{r.toNext} sticker{r.toNext === 1 ? '' : 's'}</b> away from <b>{r.next.name}</b>. Every event counts.</> : <>You reached <b>Ivy</b>, the highest rank. Thank you for leading the way.</>}</p>
        </div>
        <MemberCard me={me} />
      </section>

      {live?.live && (
        <Link to="/watch" className="livebar">
          <span className="livebar-dot"><b className="live-dot" /></span>
          <span><small>Live now</small><strong>{live.title ?? 'Live session'}</strong></span>
          <span className="btn btn-gold btn-sm">Join<Icon name="arrow" size={15} /></span>
        </Link>
      )}

      {online.length > 0 && (
        <Link to="/people" className="onlinebar">
          <span className="onlinebar-faces">{online.slice(0, 5).map((p) => <Avatar key={p.person_key} name={p.full_name} path={p.avatar_url} size={30} />)}</span>
          <span><i className="dot-on" /><b>{online.length} online now</b><small>{online.slice(0, 3).map((p) => firstName(p.full_name)).join(', ')}{online.length > 3 ? ` and ${online.length - 3} more` : ''}</small></span>
          <Icon name="arrow" size={16} />
        </Link>
      )}

      <HomePolls me={me} />

      <div className="home-grid">
        <section className="panel rankpanel">
          <div className="panel-head"><h2>Your rank</h2><Link to="/rank" className="more">Stickers<Icon name="arrow" size={14} /></Link></div>
          <div className="rank-now">
            <Medal rank={r.rank.key} size={74} />
            <div>
              <strong>{r.rank.name}</strong>
              <span>{me.total} sticker{me.total === 1 ? '' : 's'}{r.next ? ` · ${r.next.min - me.total} to ${r.next.name}` : ' · Top rank'}</span>
              <div className="bar"><i style={{ width: `${r.pct}%` }} /></div>
            </div>
          </div>
          <p className="muted small">{r.next ? <>Next unlock: <b>{r.next.perk}</b></> : r.rank.perk}</p>
          {me.stickers.length > 0 && <div className="mini-stickers">{me.stickers.slice(0, 6).map((s, i) => <span key={i} className={`sticker-disc sm${s.headliner ? ' gold' : ''}`} title={s.title}><img src="/img/mono-gold.webp" alt="" /></span>)}<Link to="/rank" className="more">{me.stickers.length} event{me.stickers.length === 1 ? '' : 's'}<Icon name="arrow" size={13} /></Link></div>}
        </section>

        <section className="panel">
          <div className="panel-head"><h2>Coming up</h2><Link to="/events" className="more">All events<Icon name="arrow" size={14} /></Link></div>
          {upcoming.length ? <ul className="mini-events">{upcoming.map((e) => (
            <li key={`${e.kind}-${e.id}`}>
              <span className="datetile"><small>{fmtDate(e.starts_at, { month: 'short' })}</small><b>{fmtDate(e.starts_at, { day: 'numeric' })}</b></span>
              <span className="mini-event-copy"><strong>{e.title}</strong><small>{fmtTime(e.starts_at)}{e.location ? ` · ${e.location}` : ''}</small></span>
              <span className="mini-event-statuses"><EventStatus status={e.status}/>{e.headliner && <span className="chip chip-gold">×2</span>}</span>
            </li>
          ))}</ul> : <p className="muted small pad">No events scheduled yet. The e-board will post the next one soon.</p>}
        </section>

        <section className="panel span2">
          <div className="panel-head"><h2>Announcements</h2><Link to="/news" className="more">See all<Icon name="arrow" size={14} /></Link></div>
          {posts.length ? <ul className="mini-posts">{posts.slice(0, 3).map((p) => (
            <li key={p.id}><Link to={`/news#${p.id}`}>
              <span className={`prio prio-${p.priority}`} />
              <span>{new Date(p.created_at).getTime() > seen && <em className="new new-top">New</em>}<strong>{p.title}</strong><small>{p.body.slice(0, 140)}{p.body.length > 140 ? '…' : ''}</small></span>
              <small className="when">{fmtWhen(p.created_at).split(' · ')[0]}</small>
            </Link></li>
          ))}</ul> : <p className="muted small pad">No announcements yet.</p>}
        </section>
      </div>

      <section className="quick">
        <Link to="/watch?tab=library" className="qa"><Icon name="live" size={22} /><strong>The Library</strong><small>Past presentations and simulations</small></Link>
        {groupme ? <a href={groupme} target="_blank" rel="noopener noreferrer" className="qa"><Icon name="chat" size={22} /><strong>GroupMe chat</strong><small>Talk with the whole Society</small></a>
          : <Link to="/people" className="qa"><Icon name="people" size={22} /><strong>Members</strong><small>Advisors, e-board and members</small></Link>}
        <Link to="/notes" className="qa"><Icon name="note" size={22} /><strong>My notes</strong><small>Private notes from every meeting</small></Link>
        <Link to="/resume" className="qa"><Icon name="resume" size={22} /><strong>Résumé builder</strong><small>USJ format, Word or PDF</small></Link>
        <Link to="/record" className="qa"><Icon name="record" size={22} /><strong>My record</strong><small>Every meeting and sticker, as a PDF</small></Link>
        <Link to="/install" className="qa"><Icon name="phone" size={22} /><strong>Get the app</strong><small>Add LPS to your home screen</small></Link>
      </section>
    </div>
  )
}
