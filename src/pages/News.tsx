import { useEffect, useState } from 'react'
import { usePosts } from '@/lib/api'
import { ago, fmtDate } from '@/lib/format'
import { Empty, ErrorBox, Icon, PageHead, Spinner } from '@/components/ui'

const KEY = 'lps-members-seen-posts'
export const seenPosts = () => Number(localStorage.getItem(KEY) ?? 0)

export function News() {
  const q = usePosts()
  const [seen] = useState(seenPosts)
  useEffect(() => { if (q.data) localStorage.setItem(KEY, String(Date.now())) }, [q.data])
  useEffect(() => { const id = location.hash.slice(1); if (id && q.data) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80) }, [q.data])
  return (
    <div className="page">
      <PageHead eyebrow="From the e-board" title="Announcements" sub="News, deadlines and opportunities for LPS members." />
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} retry={() => q.refetch()} /> : !q.data?.length ? <Empty icon="news" title="No announcements yet" body="When the e-board posts news, it appears here." /> : (
        <div className="posts">
          {q.data.map((p) => (
            <article key={p.id} id={p.id} className={`post prio-b-${p.priority}${p.pinned ? ' is-pinned' : ''}`}>
              <div className="post-tags">
                {p.pinned && <span className="chip"><Icon name="pin" size={12} />Pinned</span>}
                {p.priority !== 'normal' && <span className={`chip chip-${p.priority}`}>{p.priority === 'urgent' ? 'Urgent' : 'Important'}</span>}
                {new Date(p.created_at).getTime() > seen && <span className="chip chip-new">New</span>}
              </div>
              <h2>{p.title}</h2>
              <div className="post-body">{p.body.split(/\n\s*\n/).map((para, i) => <p key={i}>{para}</p>)}</div>
              {p.link_url && <a className="btn btn-ghost btn-sm" href={p.link_url} target="_blank" rel="noopener noreferrer">{p.link_label || 'Open link'}<Icon name="ext" size={14} /></a>}
              <footer><span>{p.author_name ?? 'LPS E-Board'}{p.author_position ? ` · ${p.author_position}` : ''}</span><span title={fmtDate(p.created_at)}>{ago(p.created_at)}</span></footer>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
