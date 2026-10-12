import { usePolls } from '@/lib/api'
import { PageHead } from '@/components/ui'
import { PollCard } from '@/components/Polls'

export function PollsPage() {
  const q = usePolls()
  const list = q.data ?? []
  const open = list.filter((p) => p.is_open), closed = list.filter((p) => !p.is_open)
  return (
    <div className="page">
      <PageHead eyebrow="Your voice" title="Polls" sub="Quick questions from the e-board. Your answers decide what LPS does next. You see the results right after you vote." />
      {q.isLoading ? <p className="muted">Loading…</p> : q.error ? <p className="muted">Could not load polls. Pull to refresh or try again later.</p> : list.length === 0 ? (
        <section className="panel"><p className="muted pad">No polls right now. When the e-board asks something, it will show up here and on your home page.</p></section>
      ) : <>
        {open.length > 0 && <div className="poll-grid">{open.map((p) => <section key={p.id} className="panel"><PollCard poll={p} /></section>)}</div>}
        {closed.length > 0 && <><h2 className="sec-title">Closed polls</h2><div className="poll-grid">{closed.map((p) => <section key={p.id} className="panel"><PollCard poll={p} /></section>)}</div></>}
      </>}
    </div>
  )
}
