import { useId, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { setEventPreregistration, useEventPreregistrations, type MemberEvent } from '@/lib/api'
import { friendly } from '@/lib/supabase'
import { Icon } from './ui'

export function EventPreregistration({ event, home = false }: { event: MemberEvent; home?: boolean }) {
  const q = useEventPreregistrations()
  const qc = useQueryClient()
  const noteId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const row = q.data?.find(r => r.id === event.id && r.kind === event.kind)
  const eligible = ['tentative', 'scheduled', 'confirmed', 'upcoming'].includes(event.status) && new Date(event.starts_at).getTime() > Date.now()
  const hasPlans = !!row?.my_planning || !!row?.planning_count
  if (!eligible && !hasPlans && !home) return null
  const closedReason = event.status === 'postponed'
    ? 'This meeting is postponed. Pre-registration will reopen once a new date is scheduled or confirmed.'
    : event.status === 'cancelled' ? 'This event has been cancelled. Pre-registration is closed.'
    : 'Pre-registration is closed because this event has started or is no longer scheduled.'
  async function toggle() {
    if (!row || busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      await setEventPreregistration(event.kind, event.id, !row.my_planning)
      // No optimistic count: display only confirmed server results.
      setNotice(row.my_planning ? 'Your pre-registration was removed.' : 'You’re on the list. Thank you for helping us plan the room.')
      await qc.invalidateQueries({ queryKey: ['event-preregistrations'] })
    } catch (e) {
      setError(friendly(e))
      void qc.invalidateQueries({ queryKey: ['events'] })
      void qc.invalidateQueries({ queryKey: ['event-preregistrations'] })
    } finally { setBusy(false) }
  }
  return <section className={`event-prereg${home ? ' event-prereg-home' : ''}`} aria-label="Optional pre-registration">
    {(eligible || hasPlans) && <div className="event-prereg-top">
      <div><span className="event-prereg-label">Optional pre-registration</span><p className="event-prereg-count" aria-live="polite">{row ? <><b>{row.planning_count}</b> {row.planning_count === 1 ? 'person' : 'people'} planning to attend</> : q.isError ? 'Count unavailable' : 'Loading attendance plans…'}</p></div>
      {(eligible || row?.my_planning) && <button type="button" className={`btn btn-sm ${row?.my_planning ? 'btn-ghost' : 'btn-gold'}`} aria-pressed={!!row?.my_planning} aria-describedby={noteId} disabled={busy || !row || q.isError} onClick={toggle}>
        <Icon name={row?.my_planning ? 'check' : 'people'} size={16} />{busy ? 'Saving…' : row?.my_planning ? 'Cancel my pre-registration' : 'I plan to attend'}
      </button>}
    </div>}
    {eligible && <p id={noteId} className="event-prereg-note">You’re welcome with or without pre-registering. Pre-register for priority seating, subject to availability — not a guaranteed seat. Your response helps us choose the room.</p>}
    {eligible && event.status === 'tentative' && <p className="event-prereg-note">This meeting is still tentative. Pre-registering shows your interest; check back for confirmed details.</p>}
    {!eligible && <p id={noteId} className="event-prereg-closed"><Icon name="clock" size={17} /><span>{closedReason}</span></p>}
    {row?.my_planning && <p className="event-prereg-saved"><Icon name="check" size={14} />Your plan is saved. You can cancel it if your plans change.</p>}
    {notice && <p className="event-prereg-saved" role="status">{notice}</p>}
    {error && <p className="event-prereg-error" role="alert">{error}</p>}
    {q.isError && (eligible || hasPlans) && <p className="event-prereg-error" role="alert">Pre-registration is temporarily unavailable. <button className="link" onClick={() => void q.refetch()}>Try again</button></p>}
  </section>
}
