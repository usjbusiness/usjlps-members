import { useEffect, useMemo, useState } from 'react'
import { useDb } from '@/lib/db'
import type { Announcement, BoardRole } from '@/lib/types'
import { ANNOUNCEMENT_PRIORITY, ANNOUNCEMENT_TAGS, DEPARTMENTS } from '@/lib/labels'
import { Modal } from '@/components/ui/Modal'
import { Field } from '@/components/forms/fields'
import { useToast } from '@/components/ui/Toast'
import { useConfirm } from '@/components/ui/Confirm'
import { useAuth } from '@/auth/AuthProvider'
import { friendlyError } from '@/lib/errors'
import { emailAllMembers, emailAnnouncement } from '@/lib/admin'
import { photoJpeg } from '@/lib/emailPhoto'
import { useAvatarSrc } from '@/lib/avatars'
import { firstNameOf, welcomeHtml } from '@/features/members/welcomeEmail'
import { imageMarker, validateEmailImages, type EmailImage } from '@/lib/emailImages'
import { EmailImageEditor } from './EmailImageEditor'
import { emailImageUrl } from './emailImageUpload'
import { canEmailMembers, useActiveRecipients, useMemberBroadcasts } from './useAnnouncements'

type Stage = 'edit' | 'review' | 'final'
export const MEMBER_EMAIL_EYEBROW = 'MESSAGE TO MEMBERS'
export const MEMBER_EMAIL_FOOTER = 'You are receiving this email because you are an active member of the USJ Leadership & Professional Society.'

type Draft = { email_images: EmailImage[]; title: string; body: string; priority: Announcement['priority']; audience: BoardRole[]; tags: string[]; pinned: boolean; expires_on: string }
const empty: Draft = { email_images: [], title: '', body: '', priority: 'normal', audience: [], tags: [], pinned: false, expires_on: '' }

export function AnnouncementComposer({ open, onClose, editing }: { open: boolean; onClose: () => void; editing?: Announcement | null }) {
  const db = useDb(); const toast = useToast(); const confirm = useConfirm(); const { profile } = useAuth()
  const [d, setD] = useState<Draft>(empty)
  const [tagInput, setTagInput] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [imageBusy, setImageBusy] = useState(false)
  const [sendEmail, setSendEmail] = useState(true)
  const [mailing, setMailing] = useState(false)
  const [toMembers, setToMembers] = useState(false)
  const [stage, setStage] = useState<Stage>('edit')
  const [understood, setUnderstood] = useState(false)
  const mayEmailMembers = canEmailMembers(profile?.role)
  const broadcasts = useMemberBroadcasts()
  const alreadyMailed = editing ? broadcasts.get(editing.id) : undefined
  const recipients = useActiveRecipients(open && mayEmailMembers)
  const count = recipients.withEmail.length
  const photoUrl = useAvatarSrc(profile?.avatar_url)
  const sample = recipients.withEmail[0]
  const preview = useMemo(() => stage === 'edit' ? '' : welcomeHtml({
    firstName: sample ? firstNameOf(sample.full_name) : 'Alex', subject: d.title, body: d.body, title: d.title,
    eyebrow: MEMBER_EMAIL_EYEBROW, footer: MEMBER_EMAIL_FOOTER,
    emailImages: d.email_images, imageSrc: emailImageUrl,
    senderName: profile?.full_name ?? 'Executive Board', senderPosition: profile?.position_title ?? '', photoSrc: photoUrl, logoSrc: '/email-logo.png',
  }), [stage, sample, d.title, d.body, d.email_images, profile?.full_name, profile?.position_title, photoUrl])

  useEffect(() => {
    if (!open) return
    setErr(null); setTagInput(''); setSendEmail(true); setToMembers(false); setStage('edit'); setUnderstood(false)
    setD(editing ? { email_images: editing.email_images ?? [], title: editing.title, body: editing.body, priority: editing.priority, audience: editing.audience, tags: editing.tags, pinned: editing.pinned, expires_on: editing.expires_on ?? '' } : empty)
  }, [open, editing])

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const addTag = (t: string) => {
    const clean = t.trim().replace(/^#/, '').slice(0, 30)
    if (clean && !d.tags.some((x) => x.toLowerCase() === clean.toLowerCase()) && d.tags.length < 10) setD({ ...d, tags: [...d.tags, clean] })
    setTagInput('')
  }

  const validate = () => {
    if (imageBusy) { setErr('Wait for the image upload to finish.'); return false }
    try { validateEmailImages(d.email_images) } catch { setErr('Invalid image. Remove it and upload it again.'); return false }
    const referenced = d.email_images.filter(i => d.body.includes(imageMarker(i.id)))
    if (referenced.some(i => !i.alt.trim())) { setErr('Add a short description for each image.'); return false }
    if (!d.title.trim()) { setErr('Add a title.'); return false }
    if (!d.body.trim()) { setErr('Write the announcement text.'); return false }
    return true
  }
  const persist = async () => {
    const pending = tagInput.trim() ? [...d.tags, tagInput.trim().replace(/^#/, '')] : d.tags
    return db.save<Announcement>('announcements', { email_images: d.email_images.filter(i => d.body.includes(imageMarker(i.id))), title: d.title.trim(), body: d.body.trim(), priority: d.priority, audience: d.audience, tags: pending, pinned: d.pinned, expires_on: d.expires_on || null }, editing?.id)
  }
  const save = async () => {
    if (!validate()) return
    if (toMembers && !editing) { setErr(null); setStage('review'); return }
    setBusy(true); setErr(null)
    try {
      const row = await persist()
      toast.ok(editing ? 'Announcement updated' : 'Announcement posted')
      onClose()
      if (!editing && sendEmail && row?.id) void mail(row.id)
    } catch (e) { setErr(friendlyError(e)) }
    finally { setBusy(false) }
  }
  const startMemberEmail = () => { if (validate()) { setErr(null); setUnderstood(false); setStage('review') } }
  const sendToMembers = async () => {
    if (!understood || !count) return
    setBusy(true); setErr(null)
    let row: Announcement | null = null
    try {
      row = await persist()
      if (!row?.id) throw new Error('The announcement could not be saved.')
      const r = await emailAllMembers(row.id, count, await photoJpeg(photoUrl))
      await db.refresh()
      if (r.failed.length) toast.error(`Emailed ${r.sent} of ${count} members. Could not send to: ${r.failed.join(', ')}`)
      else toast.ok(`Emailed to all ${r.sent} active members`)
      onClose()
      if (!editing && sendEmail) void mail(row.id)
    } catch (e) {
      if (row && !editing) { toast.error(`The announcement was posted, but the member email was not sent: ${friendlyError(e)} Open it with Edit → Email All Members to try again.`); onClose() }
      else setErr(friendlyError(e))
    } finally { setBusy(false) }
  }
  const mail = async (id: string) => {
    setMailing(true)
    try {
      const r = await emailAnnouncement(id)
      if (r.sent === 0 && !r.failed.length) toast.ok('No one else to email for the selected departments')
      else toast.ok(`Emailed to ${r.sent} member${r.sent === 1 ? '' : 's'}${r.failed.length ? ` · failed: ${r.failed.join(', ')}` : ''}`)
    } catch (e) { toast.error(e) }
    finally { setMailing(false) }
  }
  const mailExisting = async () => {
    if (!validate()) return
    if (!editing || !(await confirm({ title: 'Email this announcement?', body: 'It will be sent to every addressed board member. Each announcement can be emailed only once.', confirmLabel: 'Send Email' }))) return
    setBusy(true); setErr(null)
    try { const row = await persist(); await mail(row.id) }
    catch (e) { setErr(friendlyError(e)) }
    finally { setBusy(false) }
  }
  const remove = async () => {
    if (!editing || !(await confirm({ title: 'Delete this announcement?', body: 'It will be removed for everyone.', danger: true, confirmLabel: 'Delete' }))) return
    try { await db.remove('announcements', editing.id); toast.ok('Announcement deleted'); onClose() } catch (e) { toast.error(e) }
  }

  return (
    <Modal open={open} onClose={() => { if (!busy && !imageBusy) onClose() }} width={stage === 'edit' ? 680 : stage === 'review' ? 1040 : 560}
      title={stage === 'review' ? 'Email to All Members — Review' : stage === 'final' ? 'Final Confirmation' : editing ? 'Edit Announcement' : 'New Announcement'}
      footer={stage === 'review' ? <>
        <button className="btn btn-ghost" onClick={() => setStage('edit')}>← Back to Editing</button>
        <span className="spacer" />
        <button className="btn btn-primary" onClick={() => { setUnderstood(false); setStage('final') }} disabled={!count || recipients.isLoading}>Continue →</button>
      </> : stage === 'final' ? <>
        <button className="btn btn-ghost" onClick={() => setStage('review')} disabled={busy}>← Back</button>
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-danger" onClick={sendToMembers} disabled={busy || !understood || !count}>{busy ? 'Sending… please wait' : `Yes, Send to ${count} Members`}</button>
      </> : <>
        {editing && <button className="btn btn-ghost btn-danger-text" onClick={remove} disabled={busy || imageBusy}>Delete</button>}
        {editing && <button className="btn btn-ghost" onClick={mailExisting} disabled={mailing || busy || imageBusy}>{mailing ? 'Sending…' : 'Email the Board'}</button>}
        {editing && mayEmailMembers && !alreadyMailed && <button className="btn btn-ghost btn-members" onClick={startMemberEmail} disabled={busy || imageBusy}>Email All Members</button>}
        <span className="spacer" />
        <button className="btn btn-ghost" onClick={onClose} disabled={busy || imageBusy}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy || imageBusy}>{busy ? 'Saving…' : editing ? 'Save Changes' : toMembers ? 'Review Member Email →' : 'Post Announcement'}</button>
      </>}>
      {err && <div className="form-alert" role="alert">{err}</div>}
      {stage === 'review' && (
        <div className="mb-review">
          <div className="mb-side">
            <div className="mb-count"><span className="mb-num">{recipients.isLoading ? '…' : count}</span><span>active members will receive this email</span></div>
            <p className="muted small">Sent one by one from the Society email via Resend under <strong>{profile?.full_name}</strong> ({profile?.position_title}) with your photo signature, like the welcome letter. Each member sees only their own address. Replies go to {profile?.email ?? 'you'}.</p>
            {recipients.noEmail.length > 0 && <p className="field-help text-alert">{recipients.noEmail.length} active member{recipients.noEmail.length === 1 ? ' has' : 's have'} no email and will be skipped: {recipients.noEmail.map((m) => m.full_name).join(', ')}</p>}
            <span className="field-label">Recipients</span>
            <div className="mb-list">{recipients.withEmail.map((m) => <span key={m.id} className="wl-chip" title={m.email ?? ''}>{m.full_name}</span>)}</div>
            {!profile?.avatar_url && <p className="muted small">Tip: add your photo in Account → Profile Photo — it appears in your signature.</p>}
          </div>
          <div className="welcome-preview">
            <div className="wp-head"><span className="stat-label">Preview{sample ? ` — as ${sample.full_name} will see it` : ''}</span><span className="wp-subject">{d.title} — USJ Leadership & Professional Society</span></div>
            <iframe title="Email preview" srcDoc={preview} sandbox="" />
          </div>
        </div>
      )}
      {stage === 'final' && (
        <div className="mb-final">
          <div className="mb-warn">
            <span className="mb-warn-icon" aria-hidden="true">!</span>
            <div>
              <strong>You are about to email {count} people.</strong>
              <p>Every active member of the USJ Leadership & Professional Society will receive “{d.title}” signed by {profile?.full_name}, {profile?.position_title}. An email cannot be unsent, and each announcement can be emailed to the members only once.</p>
            </div>
          </div>
          <label className="check mb-understand"><input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} /> I understand that this email will be sent to all {count} active members.</label>
        </div>
      )}
      {stage === 'edit' && <>
      <p className="muted small" style={{ marginTop: 0 }}>Posting as <strong>{profile?.full_name}</strong> · {profile?.position_title}</p>
      <div className="form-grid">
        <Field label="Title" htmlFor="an-title" required full>
          <input id="an-title" value={d.title} maxLength={200} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="e.g. Constitution review due Friday" />
        </Field>
        <Field label="Message" htmlFor="an-body" required full>
          <EmailImageEditor body={d.body} images={d.email_images} onBusy={setImageBusy}
            onChange={(body, email_images) => setD(prev => ({ ...prev, body, email_images }))} />
        </Field>
        <Field label="Departments" full help="Leave all unselected to address the entire Board. Selected departments see it marked “For you”.">
          <div className="chip-picker" role="group" aria-label="Departments">
            {DEPARTMENTS.map((dep) => (
              <button type="button" key={dep.value} className={`chip chip-dept chip-toggle ${d.audience.includes(dep.value as BoardRole) ? 'is-on' : ''}`}
                aria-pressed={d.audience.includes(dep.value as BoardRole)} onClick={() => setD({ ...d, audience: toggle(d.audience, dep.value as BoardRole) })}>@ {dep.label}</button>
            ))}
          </div>
        </Field>
        <Field label="Tags" htmlFor="an-tag" full help="Click a suggestion or type your own and press Enter.">
          <div className="chip-picker">
            {d.tags.map((t) => <button type="button" key={t} className="chip chip-tag chip-toggle is-on" onClick={() => setD({ ...d, tags: d.tags.filter((x) => x !== t) })} aria-label={`Remove tag ${t}`}># {t} ×</button>)}
            <input id="an-tag" className="chip-input" value={tagInput} placeholder="Add tag…" maxLength={30}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) } }} />
          </div>
          <div className="chip-picker chip-suggest">
            {ANNOUNCEMENT_TAGS.filter((t) => !d.tags.includes(t)).map((t) => <button type="button" key={t} className="chip chip-tag chip-toggle" onClick={() => addTag(t)}># {t}</button>)}
          </div>
        </Field>
        <Field label="Priority" htmlFor="an-pri">
          <select id="an-pri" value={d.priority} onChange={(e) => setD({ ...d, priority: e.target.value as Draft['priority'] })}>
            {ANNOUNCEMENT_PRIORITY.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Show Until (optional)" htmlFor="an-exp" help="Hidden from the Dashboard after this date.">
          <input id="an-exp" type="date" value={d.expires_on} onChange={(e) => setD({ ...d, expires_on: e.target.value })} />
        </Field>
        {!editing && <label className="check field-full"><input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} /> Also send by email to {d.audience.length ? 'the selected departments' : 'the entire Board'}</label>}
        <label className="check field-full"><input type="checkbox" checked={d.pinned} onChange={(e) => setD({ ...d, pinned: e.target.checked })} /> Pin to the top of the Dashboard</label>
        {!editing && mayEmailMembers && (
          <label className={`check field-full mb-option ${toMembers ? 'is-on' : ''}`}>
            <input type="checkbox" checked={toMembers} onChange={(e) => setToMembers(e.target.checked)} />
            <span><strong>Also email this to all active members{recipients.isLoading ? '' : ` (${count} people)`}</strong>
              <small>The General Body, not only the Board. Signed with your name, position and photo. You will review it and confirm twice before anything is sent.</small></span>
          </label>
        )}
        {editing && alreadyMailed && <p className="field-full mb-sent-note"><strong>Emailed to all members</strong> on {new Date(alreadyMailed.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })} by {alreadyMailed.sender_name} ({alreadyMailed.sent} sent). Changes here do not update the email.</p>}
      </div>
      </>}
    </Modal>
  )
}
