import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CATEGORIES, PROPOSAL_STATUS, useProposals } from '@/lib/api'
import { ago } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { Icon, PageHead, useToast } from '@/components/ui'

export function Propose() {
  const q = useProposals(); const qc = useQueryClient(); const toast = useToast()
  const [f, setF] = useState({ title: '', category: '', description: '', timing: '', can_help: false })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(null)
    if (f.title.trim().length < 3) return setErr('Give your event a name.')
    if (!f.category) return setErr('Choose the kind of event.')
    if (f.description.trim().length < 10) return setErr('Tell us a little more about the idea (at least 10 characters).')
    setBusy(true)
    const { error } = await supabase.rpc('propose_event', { p_title: f.title, p_category: f.category, p_description: f.description, p_timing: f.timing || null, p_can_help: f.can_help })
    setBusy(false)
    if (error) return setErr(error.message)
    toast.ok('Thank you! Your idea was sent to the e-board.')
    setF({ title: '', category: '', description: '', timing: '', can_help: false })
    qc.invalidateQueries({ queryKey: ['proposals'] })
  }
  return (
    <div className="page">
      <PageHead eyebrow="Your voice" title="Propose an Event" sub="LPS is built by its members. Suggest a guest, a simulation, a trip or anything you want to see. The e-board reads every idea." />
      <div className="two">
        <form className="panel form" onSubmit={submit} noValidate>
          <label className="fld"><span>Event name</span><input value={f.title} maxLength={120} placeholder="e.g. Hospital CEO Headliner" onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
          <div className="fld"><span>Kind of event</span>
            <div className="cats">{CATEGORIES.map((c) => <button type="button" key={c.value} className={`cat${f.category === c.value ? ' on' : ''}`} onClick={() => setF({ ...f, category: c.value })}><strong>{c.label}</strong><small>{c.hint}</small></button>)}</div>
          </div>
          <label className="fld"><span>The idea</span><textarea rows={5} maxLength={2000} placeholder="What happens, who would you invite and why would members love it?" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /><small className="count">{f.description.length}/2000</small></label>
          <label className="fld"><span>When <em className="opt-pill">Optional</em></span><input value={f.timing} maxLength={120} placeholder="e.g. Before finals, a Thursday evening" onChange={(e) => setF({ ...f, timing: e.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={f.can_help} onChange={(e) => setF({ ...f, can_help: e.target.checked })} /><span>I would like to help organize it</span></label>
          {err && <p className="form-err" role="alert">{err}</p>}
          <button className="btn btn-gold btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send my idea'}<Icon name="arrow" size={16} /></button>
        </form>
        <section className="panel">
          <div className="panel-head"><h2>My ideas</h2></div>
          {!q.data?.length ? <p className="muted small pad">Ideas you send appear here with the e-board's answer.</p> : (
            <ul className="ideas">{q.data.map((p) => (
              <li key={p.id}>
                <div><strong>{p.title}</strong><span className={`chip chip-p-${p.status}`}>{PROPOSAL_STATUS[p.status] ?? p.status}</span></div>
                <small>{CATEGORIES.find((c) => c.value === p.category)?.label} · {ago(p.created_at)}</small>
                {p.response && <p className="reply"><Icon name="chat" size={14} />{p.response}</p>}
              </li>
            ))}</ul>
          )}
        </section>
      </div>
    </div>
  )
}
