import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEvents, useNotes, type MemberEvent } from '@/lib/api'
import { addToCalendar, fmtDate, fmtTime } from '@/lib/format'
import { Empty, ErrorBox, Icon, PageHead, Spinner } from '@/components/ui'

function EventCard({ e, past, hasNote }: { e: MemberEvent; past?: boolean; hasNote?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <article className={`event${past ? ' is-past' : ''}`}>
      <span className="datetile big"><small>{fmtDate(e.starts_at, { month: 'short' })}</small><b>{fmtDate(e.starts_at, { day: 'numeric' })}</b><small>{fmtDate(e.starts_at, { weekday: 'short' })}</small></span>
      <div className="event-main">
        <div className="post-tags">
          <span className="chip">{e.kind === 'meeting' ? 'General Meeting' : 'Event'}</span>
          {e.headliner && <span className="chip chip-gold"><Icon name="star" size={12} />Headliner · counts double</span>}
          {e.status === 'postponed' && <span className="chip chip-important">Postponed</span>}
          {past && e.attended && <span className="chip chip-ok"><Icon name="check" size={12} />Sticker earned</span>}
        </div>
        <h3>{e.title}</h3>
        <p className="event-meta"><span><Icon name="clock" size={14} />{fmtTime(e.starts_at)}{e.ends_at ? ` – ${fmtTime(e.ends_at)}` : ''}</span>{e.location && <span><Icon name="pin" size={14} />{e.location}</span>}</p>
        {e.description && <p className={`event-desc${open ? ' is-open' : ''}`} onClick={() => setOpen(!open)}>{e.description}</p>}
        <div className="event-actions">
          {!past && <button className="btn btn-ghost btn-sm" onClick={() => addToCalendar(e)}><Icon name="calendar" size={15} />Add to calendar</button>}
          <Link to={`/notes?ref=${e.kind}:${e.id}`} className={`btn btn-ghost btn-sm${hasNote ? ' has-note' : ''}`}><Icon name="note" size={15} />{hasNote ? 'My notes' : 'Take notes'}</Link>
        </div>
      </div>
    </article>
  )
}

export function Events() {
  const q = useEvents()
  const notes = useNotes().data ?? []
  const noted = new Set(notes.map((n) => `${n.ref_kind}:${n.ref_id}`))
  const [tab, setTab] = useState<'up' | 'past'>('up')
  const now = Date.now() - 3 * 3600e3
  const all = q.data ?? []
  const up = all.filter((e) => new Date(e.starts_at).getTime() >= now).sort((a, b) => a.starts_at.localeCompare(b.starts_at))
  const past = all.filter((e) => new Date(e.starts_at).getTime() < now).sort((a, b) => b.starts_at.localeCompare(a.starts_at))
  const list = tab === 'up' ? up : past
  return (
    <div className="page">
      <PageHead eyebrow="Calendar" title="Events" sub="General meetings, Headliners and everything in between. Every event you attend earns a sticker." />
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={tab === 'up'} className={tab === 'up' ? 'on' : ''} onClick={() => setTab('up')}>Upcoming<span>{up.length}</span></button>
        <button role="tab" aria-selected={tab === 'past'} className={tab === 'past' ? 'on' : ''} onClick={() => setTab('past')}>Past<span>{past.length}</span></button>
      </div>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} retry={() => q.refetch()} /> : !list.length
        ? <Empty icon="calendar" title={tab === 'up' ? 'Nothing scheduled yet' : 'No past events yet'} body={tab === 'up' ? 'New events appear here as soon as the e-board confirms them.' : 'Events you attend will show up here with your stickers.'} />
        : <div className="events">{list.map((e) => <EventCard key={`${e.kind}-${e.id}`} e={e} past={tab === 'past'} hasNote={noted.has(`${e.kind}:${e.id}`)} />)}</div>}
    </div>
  )
}
