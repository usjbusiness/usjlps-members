import { HomeEvents } from '@/components/HomeEvents'
import { Link } from 'react-router-dom'
import { isOnline, rankOf, useDirectory, useEvents, useLiveNow, useMe, usePolls, usePosts, type Me } from '@/lib/api'
import { fmtDate, fmtWhen, firstName, greeting } from '@/lib/format'
import { Avatar, ErrorBox, Icon, Medal, Spinner } from '@/components/ui'
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

/** Operational updates belong above tools, personalization and rewards. */
function HomeAnnouncements() {
  const q = usePosts()
  const seen = seenPosts()
  const posts = [...(q.data ?? [])].sort((a, b) =>
    Number(b.priority === 'urgent') - Number(a.priority === 'urgent') ||
    Number(b.pinned) - Number(a.pinned) ||
    Number(b.priority === 'important') - Number(a.priority === 'important') ||
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const unread = posts.filter(p => new Date(p.created_at).getTime() > seen).length
  return <section className="home-announcements" aria-labelledby="home-announcements-title">
    <div className="home-section-heading">
      <div><h2 id="home-announcements-title">Announcements{unread > 0 && <span className="home-unread">{unread} new</span>}</h2><p>Updates, deadlines and opportunities from the e-board.</p></div>
      <Link to="/news" className="more">All announcements<Icon name="arrow" size={14} /></Link>
    </div>
    {q.isLoading ? <div className="home-announcements-state"><Spinner /></div> : q.error ? <ErrorBox error={q.error} retry={() => q.refetch()} /> : posts.length ? <ul className="home-announcement-list">
      {posts.slice(0, 3).map(p => <li key={p.id}>
        <Link to={`/news#${p.id}`} className={`home-announcement home-announcement-${p.priority}`}>
          <span className="home-announcement-copy">
            <span className="home-announcement-meta">
              {p.priority === 'urgent' ? <b className="home-announcement-priority is-urgent">Urgent</b> : p.priority === 'important' ? <b className="home-announcement-priority">Important</b> : null}
              {p.pinned && <span className="home-announcement-pinned"><Icon name="pin" size={14} />Pinned</span>}
              {new Date(p.created_at).getTime() > seen && <span className="home-announcement-new">New</span>}
              <time dateTime={p.created_at}>{fmtWhen(p.created_at).split(' · ')[0]}</time>
            </span>
            <strong>{p.title}</strong>
            <span className="home-announcement-excerpt">{p.body.slice(0, 200)}{p.body.length > 200 ? '…' : ''}</span>
          </span>
          <Icon name="arrow" size={18} />
        </Link>
      </li>)}
    </ul> : <div className="home-announcements-state"><Icon name="news" size={20} /><p>No announcements yet. New updates will appear here.</p></div>}
  </section>
}

export function Home() {
  const me = useMe().data!
  const events = useEvents().data ?? []
  const live = useLiveNow().data
  const r = rankOf(me.total)
  const name = me.member?.full_name ?? me.board?.full_name ?? ''
  const now = Date.now()
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() > now - 3 * 3600e3 && !['cancelled','completed'].includes(e.status)).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
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

      <HomeEvents events={upcoming} />

      <div id="home-below-events" className="home-below-events">
        <HomeAnnouncements />
      </div>

      <section className="home-workspace" aria-labelledby="home-workspace-title">
        <div className="home-section-heading"><div><h2 id="home-workspace-title">Your workspace</h2><p>Useful tools, one click away.</p></div></div>
        <div className="quick home-tools">
          <Link to="/watch?tab=library" className="qa"><Icon name="live" size={22} /><strong>The Library</strong><small>Presentations &amp; simulations</small></Link>
          <Link to="/notes" className="qa"><Icon name="note" size={22} /><strong>My notes</strong><small>Private notes from meetings</small></Link>
          <Link to="/resume" className="qa"><Icon name="resume" size={22} /><strong>Résumé builder</strong><small>USJ format · Word or PDF</small></Link>
          {groupme ? <a href={groupme} target="_blank" rel="noopener noreferrer" className="qa"><Icon name="chat" size={22} /><strong>GroupMe chat</strong><small>Connect with the Society</small></a>
            : <Link to="/people" className="qa"><Icon name="people" size={22} /><strong>Members</strong><small>Find your LPS community</small></Link>}
        </div>
      </section>

      <HomePolls me={me} />

      {online.length > 0 && (
        <Link to="/people" className="onlinebar">
          <span className="onlinebar-faces">{online.slice(0, 5).map((p) => <Avatar key={p.person_key} name={p.full_name} path={p.avatar_url} size={30} />)}</span>
          <span><i className="dot-on" /><b>{online.length} online now</b><small>{online.slice(0, 3).map((p) => firstName(p.full_name)).join(', ')}{online.length > 3 ? ` and ${online.length - 3} more` : ''}</small></span>
          <Icon name="arrow" size={16} />
        </Link>
      )}

        <section className="panel rankpanel home-progress" aria-labelledby="home-progress-title">
          <div className="panel-head"><h2 id="home-progress-title">Your progress</h2><Link to="/rank" className="more">Stickers<Icon name="arrow" size={14} /></Link></div>
          <div className="rank-now">
            <Medal rank={r.rank.key} size={56} />
            <div>
              <strong>{r.rank.name}</strong>
              <span>{me.total} sticker{me.total === 1 ? '' : 's'}{r.next ? ` · ${r.next.min - me.total} to ${r.next.name}` : ' · Top rank'}</span>
              <div className="bar"><i style={{ width: `${r.pct}%` }} /></div>
            </div>
          </div>
          <p className="muted small">{r.next ? <>Next unlock: <b>{r.next.perk}</b></> : r.rank.perk}</p>
          {me.stickers.length > 0 && <div className="mini-stickers">{me.stickers.slice(0, 6).map((s, i) => <span key={i} className={`sticker-disc sm${s.headliner ? ' gold' : ''}`} title={s.title}><img src="/img/mono-gold.webp" alt="" /></span>)}<Link to="/rank" className="more">{me.stickers.length} event{me.stickers.length === 1 ? '' : 's'}<Icon name="arrow" size={13} /></Link></div>}
          <div className="home-progress-links"><Link to="/record" className="more">My attendance record<Icon name="arrow" size={14} /></Link></div>
        </section>

      <footer className="home-utility"><span>LPS, wherever you go.</span><Link to="/install" className="more"><Icon name="phone" size={16} />Get the app<Icon name="arrow" size={14} /></Link></footer>
    </div>
  )
}
