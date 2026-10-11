import { useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { useEvents, useNotes, type MemberEvent, type Note } from '@/lib/api'
import { fmtDate } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { Empty, ErrorBox, Icon, PageHead, Spinner, useToast } from '@/components/ui'

type Draft = { id: string | null; title: string; body: string; pinned: boolean; ref: string }
const refKey = (kind?: string | null, id?: string | null) => (kind && id ? `${kind}:${id}` : '')
const blank = (ref = '', title = ''): Draft => ({ id: null, title, body: '', pinned: false, ref })
const toDraft = (n: Note): Draft => ({ id: n.id, title: n.title, body: n.body, pinned: n.pinned, ref: refKey(n.ref_kind, n.ref_id) })
const ago = (ts: string) => {
  const d = new Date(ts); const today = new Date().toDateString() === d.toDateString()
  return today ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : fmtDate(ts, { month: 'short', day: 'numeric' })
}

function Editor({ draft, events, onSaved, onDeleted, onBack }: { draft: Draft; events: MemberEvent[]; onSaved: (n: Note) => void; onDeleted: () => void; onBack: () => void }) {
  const toast = useToast()
  const [d, setD] = useState(draft)
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const dirty = useRef(false)
  const idRef = useRef(draft.id)
  const saving = useRef<Promise<unknown> | null>(null)
  useEffect(() => { setD(draft); idRef.current = draft.id; dirty.current = false; setState('idle') }, [draft])

  const save = async (x: Draft) => {
    if (!x.id && !idRef.current && !x.title.trim() && !x.body.trim()) return
    if (saving.current) await saving.current
    const ev = events.find((e) => refKey(e.kind, e.id) === x.ref)
    const row = {
      title: x.title.slice(0, 200), body: x.body.slice(0, 20000), pinned: x.pinned,
      ref_kind: ev ? ev.kind : null, ref_id: ev ? ev.id : null, ref_title: ev ? ev.title.slice(0, 200) : null, ref_date: ev ? ev.starts_at : null,
    }
    setState('saving')
    const q = idRef.current
      ? supabase.from('member_notes').update(row).eq('id', idRef.current).select().single()
      : supabase.from('member_notes').insert(row).select().single()
    const p = Promise.resolve(q).then(({ data, error }) => {
      if (error) { toast.error(error); setState('idle'); return }
      idRef.current = (data as Note).id; dirty.current = false; setState('saved'); onSaved(data as Note)
    })
    saving.current = p; await p; saving.current = null
  }
  // Autosave a moment after you stop typing.
  useEffect(() => {
    if (!dirty.current) return
    const t = window.setTimeout(() => { void save(d) }, 900)
    return () => window.clearTimeout(t)
  }, [d]) // eslint-disable-line react-hooks/exhaustive-deps
  // Save on leave.
  const latest = useRef(d); latest.current = d
  useEffect(() => () => { if (dirty.current) void save(latest.current) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const change = (patch: Partial<Draft>) => { dirty.current = true; setState('idle'); setD((v) => ({ ...v, ...patch })) }
  const remove = async () => {
    if (!idRef.current) { onDeleted(); return }
    if (!window.confirm('Delete this note? This cannot be undone.')) return
    const { error } = await supabase.from('member_notes').delete().eq('id', idRef.current)
    if (error) { toast.error(error); return }
    dirty.current = false; toast.ok('Note deleted.'); onDeleted()
  }
  const sorted = [...events].sort((a, b) => b.starts_at.localeCompare(a.starts_at))
  return (
    <section className="panel note-editor">
      <div className="note-bar">
        <button className="link note-back" onClick={onBack}><Icon name="back" size={16} />All notes</button>
        <span className="note-state">{state === 'saving' ? 'Saving…' : state === 'saved' ? <><Icon name="check" size={13} />Saved</> : dirty.current ? 'Editing' : ''}</span>
        <button className={`icon-btn${d.pinned ? ' on' : ''}`} title={d.pinned ? 'Unpin' : 'Pin to top'} aria-label="Pin" onClick={() => change({ pinned: !d.pinned })}><Icon name="pinned" size={18} /></button>
        <button className="icon-btn" title="Delete note" aria-label="Delete" onClick={remove}><Icon name="trash" size={18} /></button>
      </div>
      <input className="note-title" placeholder="Title" maxLength={200} value={d.title} onChange={(e) => change({ title: e.target.value })} />
      <label className="note-ref"><Icon name="calendar" size={15} />
        <select value={d.ref} onChange={(e) => change({ ref: e.target.value })} aria-label="Meeting or event">
          <option value="">Not linked to a meeting</option>
          {sorted.map((e) => <option key={refKey(e.kind, e.id)} value={refKey(e.kind, e.id)}>{fmtDate(e.starts_at, { month: 'short', day: 'numeric' })} · {e.title}</option>)}
        </select>
      </label>
      <textarea className="note-body" placeholder="Key takeaways, names to remember, follow-ups…" maxLength={20000} value={d.body} onChange={(e) => change({ body: e.target.value })} autoFocus={!d.id} />
      <p className="muted small note-foot"><Icon name="lock" size={13} />Only you can see your notes. Not even the e-board can read them.</p>
    </section>
  )
}

export function NotesPage() {
  const q = useNotes()
  const events = useEvents().data ?? []
  const qc = useQueryClient()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<Draft | null>(null)
  const notes = q.data ?? []

  // Opened from an event card: /notes?ref=meeting:<id>
  useEffect(() => {
    const ref = params.get('ref')
    if (!ref || q.isLoading) return
    const found = notes.find((n) => refKey(n.ref_kind, n.ref_id) === ref)
    if (found) setOpen(toDraft(found))
    else {
      const ev = events.find((e) => refKey(e.kind, e.id) === ref)
      if (!ev && !events.length) return
      setOpen(blank(ev ? ref : '', ev ? `${ev.title} notes` : ''))
    }
    setParams({}, { replace: true })
  }, [params, q.isLoading, events.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const s = search.trim().toLowerCase()
  const shown = useMemo(() => notes.filter((n) => !s || `${n.title} ${n.body} ${n.ref_title ?? ''}`.toLowerCase().includes(s)), [notes, s])
  const saved = (n: Note) => {
    qc.setQueryData<Note[]>(['notes'], (old) => {
      const rest = (old ?? []).filter((x) => x.id !== n.id)
      return [n, ...rest].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updated_at.localeCompare(a.updated_at))
    })
  }
  const deleted = () => { setOpen(null); void qc.invalidateQueries({ queryKey: ['notes'] }) }

  return (
    <div className={`page notes-page${open ? ' has-open' : ''}`}>
      <PageHead eyebrow="Private" title="My Notes" sub="Take notes during meetings and Headliners. Link a note to a meeting so you can find it later."
        actions={<button className="btn btn-gold btn-sm" onClick={() => setOpen(blank())}><Icon name="plus" size={16} />New note</button>} />
      <div className="notes">
        <aside className="notes-list">
          <div className="filters"><label className="search"><Icon name="search" size={17} /><input type="search" placeholder="Search my notes" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div>
          {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} retry={() => q.refetch()} /> : !shown.length
            ? <Empty icon="note" title={s ? 'No notes match' : 'No notes yet'} body={s ? 'Try another word.' : 'Tap New note, or open Events and press Notes on a meeting.'} />
            : <ul>{shown.map((n) => (
              <li key={n.id}><button className={open?.id === n.id ? 'on' : ''} onClick={() => setOpen(toDraft(n))}>
                <span className="nl-top"><strong>{n.pinned && <Icon name="pinned" size={13} />}{n.title || 'Untitled note'}</strong><small>{ago(n.updated_at)}</small></span>
                {n.ref_title && <span className="nl-ref"><Icon name="calendar" size={12} />{n.ref_title}</span>}
                <span className="nl-body">{n.body.slice(0, 120) || 'No text yet'}</span>
              </button></li>
            ))}</ul>}
        </aside>
        {open ? <Editor key={open.id ?? 'new'} draft={open} events={events} onSaved={saved} onDeleted={deleted} onBack={() => setOpen(null)} />
          : <section className="panel note-empty"><Icon name="note" size={30} /><p>Choose a note or start a new one.</p></section>}
      </div>
    </div>
  )
}
