import { useState } from 'react'
import type { Announcement } from '@/lib/types'
import { label, DEPARTMENTS } from '@/lib/labels'
import { fmtDate, fmtDateTime } from '@/lib/format'
import { PersonAvatar } from '@/components/ui/Avatar'
import { AnnouncementBody } from './AnnouncementBody'
import { emailBodyText } from '@/lib/emailImages'
import { useMemberBroadcasts } from './useAnnouncements'

const PREVIEW = 320

export function AnnouncementCard({ a, isNew, forMe, canEdit, onEdit, onOpen, compact }: {
  a: Announcement; isNew: boolean; forMe: boolean; canEdit: boolean; onEdit?: () => void; onOpen?: () => void; compact?: boolean
}) {
  const [expanded, setExpanded] = useState(!compact)
  const mailed = useMemberBroadcasts().get(a.id)
  const long = a.body.length > PREVIEW || a.body.split('\n').length > 4
  const full = expanded || !long
  const plain = emailBodyText(a.body, a.email_images)
  const body = full ? a.body : plain.slice(0, PREVIEW).trimEnd() + '…'
  const edited = a.updated_at && new Date(a.updated_at).getTime() - new Date(a.created_at).getTime() > 60_000
  return (
    <article className={`announcement priority-${a.priority} ${expanded ? 'is-expanded' : ''} ${isNew ? 'is-new' : ''} ${forMe ? 'is-for-me' : ''}`} onClick={onOpen}>
      <header className="announcement-author">
        <PersonAvatar id={a.author_id} name={a.author_name} size={34} />
        <div className="author-meta">
          <span className="author-name">{a.author_name ?? 'Former board member'}</span>
          <span className="author-position">{a.author_position ?? ''}</span>
        </div>
        <div className="announcement-flags">
          {mailed && <span className="flag flag-members" title={`Emailed to ${mailed.sent} of ${mailed.recipients} active members by ${mailed.sender_name ?? 'the Executive Board'} on ${fmtDateTime(mailed.created_at)}`}>Emailed to all members · {mailed.sent}</span>}
          {isNew && <span className="flag flag-new">New</span>}
          {a.pinned && <span className="flag">Pinned</span>}
          {a.priority !== 'normal' && <span className={`flag flag-${a.priority}`}>{a.priority === 'urgent' ? 'Urgent' : 'Important'}</span>}
        </div>
      </header>
      <h3 className="announcement-title">{a.title}</h3>
      <div className="announcement-body">{full ? <AnnouncementBody body={body} images={a.email_images} /> : <p>{body}</p>}</div>
      {long && compact && (
        <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); onOpen?.() }}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
      <footer className="announcement-foot">
        <div className="announcement-chips">
          {a.audience.length === 0
            ? <span className="chip chip-dept">@ Entire Board</span>
            : a.audience.map((r) => <span key={r} className="chip chip-dept">@ {label(DEPARTMENTS, r)}</span>)}
          {a.tags.map((t) => <span key={t} className="chip chip-tag"># {t}</span>)}
        </div>
        <span className="announcement-date" title={fmtDateTime(a.created_at)}>
          {fmtDate(a.created_at)}{edited ? ' · edited' : ''}{a.expires_on ? ` · until ${fmtDate(a.expires_on, 'MMM d')}` : ''}
          {canEdit && onEdit && <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); onEdit() }}>Edit</button>}
        </span>
      </footer>
    </article>
  )
}
