import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { INTERESTS, type Poll } from '@/lib/api'
import { fmtDate } from '@/lib/format'
import { useToast } from '@/components/ui'

const pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0)

/** One poll: answer it, then see the live results. */
export function PollCard({ poll, compact }: { poll: Poll; compact?: boolean }) {
  const qc = useQueryClient(); const toast = useToast()
  const voted = !!poll.my_choices && (poll.my_choices.length > 0 || !!poll.my_other)
  const [editing, setEditing] = useState(!voted && poll.is_open)
  const [pick, setPick] = useState<number[]>(poll.my_choices ?? [])
  const [other, setOther] = useState(poll.my_other ?? '')
  const [otherOn, setOtherOn] = useState(!!poll.my_other)
  const [busy, setBusy] = useState(false)
  const toggle = (i: number) => {
    if (poll.multi) setPick(pick.includes(i) ? pick.filter((x) => x !== i) : [...pick, i])
    else { setPick([i]); setOtherOn(false) }
  }
  const submit = async () => {
    setBusy(true)
    const { error } = await supabase.rpc('member_vote', { p_poll: poll.id, p_choices: pick, p_other: otherOn ? other : null })
    setBusy(false)
    if (error) { toast.error(error); return }
    toast.ok('Thanks! Your answer is saved.'); setEditing(false)
    qc.invalidateQueries({ queryKey: ['polls'] })
  }
  const counts = poll.counts ?? []
  const top = Math.max(1, ...counts)
  const can = pick.length > 0 || (otherOn && other.trim().length > 0)
  return (
    <div className={`poll${compact ? ' is-compact' : ''}`}>
      <p className="poll-q">{poll.question}</p>
      {poll.details && <p className="muted small">{poll.details}</p>}
      <p className="poll-meta">{poll.is_open ? <><i className="dot-on" />Open</> : 'Closed'} · {poll.multi ? 'Pick all that apply' : 'Pick one'} · {poll.voters} answer{poll.voters === 1 ? '' : 's'}{poll.closes_at ? ` · ${poll.is_open ? 'closes' : 'closed'} ${fmtDate(poll.closes_at)}` : ''}</p>
      {editing ? <>
        <div className="poll-opts" role={poll.multi ? 'group' : 'radiogroup'}>
          {poll.options.map((o, k) => {
            const i = k + 1, on = pick.includes(i)
            return <button key={i} type="button" role={poll.multi ? 'checkbox' : 'radio'} aria-checked={on} className={`poll-opt${on ? ' on' : ''}`} onClick={() => toggle(i)}>
              <span className={poll.multi ? 'box' : 'radio'} />{o}</button>
          })}
          {poll.allow_other && <button type="button" role={poll.multi ? 'checkbox' : 'radio'} aria-checked={otherOn} className={`poll-opt${otherOn ? ' on' : ''}`}
            onClick={() => { setOtherOn(!otherOn); if (!poll.multi && !otherOn) setPick([]) }}><span className={poll.multi ? 'box' : 'radio'} />Other</button>}
        </div>
        {otherOn && <input className="poll-other" maxLength={200} value={other} placeholder="Your answer" onChange={(e) => setOther(e.target.value)} autoFocus />}
        <div className="poll-btns">
          <button className="btn btn-gold btn-sm" disabled={!can || busy} onClick={submit}>{busy ? 'Saving…' : voted ? 'Update answer' : 'Submit'}</button>
          {voted && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>}
        </div>
      </> : <>
        <ol className="poll-res">
          {poll.options.map((o, k) => {
            const n = counts[k] ?? 0, mine = poll.my_choices?.includes(k + 1)
            return <li key={k} className={`${n === top && n > 0 ? 'top' : ''}${mine ? ' mine' : ''}`}>
              <span className="poll-fill" style={{ width: `${pct(n, poll.voters)}%` }} />
              <span className="poll-lbl">{o}{mine && <em>Your answer</em>}</span><b>{pct(n, poll.voters)}%</b>
            </li>
          })}
        </ol>
        {poll.my_other && <p className="muted small">Your other answer: “{poll.my_other}”</p>}
        {!voted && !poll.is_open && <p className="muted small">This poll is closed.</p>}
        {poll.is_open && voted && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Change my answer</button>}
      </>}
    </div>
  )
}

/** Pick interests (same list as the Join page). Saves straight away. */
export function InterestsPicker({ value, onSaved }: { value: string[]; onSaved?: () => void }) {
  const qc = useQueryClient(); const toast = useToast()
  const [sel, setSel] = useState<string[]>(value)
  const [busy, setBusy] = useState(false)
  const changed = sel.length !== value.length || sel.some((x) => !value.includes(x))
  const save = async () => {
    setBusy(true)
    const { error } = await supabase.rpc('member_set_interests', { p_interests: sel })
    setBusy(false)
    if (error) { toast.error(error); return }
    toast.ok('Interests saved. The e-board will plan around them.')
    qc.invalidateQueries({ queryKey: ['me'] }); onSaved?.()
  }
  const extra = value.filter((x) => !INTERESTS.includes(x))
  return (
    <div className="interests">
      <div className="chips-pick">
        {[...INTERESTS, ...extra].map((i) => <button key={i} type="button" aria-pressed={sel.includes(i)} className={`fchip${sel.includes(i) ? ' on' : ''}`}
          onClick={() => setSel(sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i])}>{i}</button>)}
      </div>
      <button className="btn btn-gold btn-sm" disabled={!changed || busy} onClick={save}>{busy ? 'Saving…' : 'Save interests'}</button>
    </div>
  )
}
