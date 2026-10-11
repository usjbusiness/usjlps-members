import { Fragment, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
import { MAJOR_ROLE, rankOf, useMe } from '@/lib/api'
import { fmtDate } from '@/lib/format'
import { remember, supabase } from '@/lib/supabase'
import { Avatar, Icon, Medal, PageHead, useToast } from '@/components/ui'
import { MemberCard } from './Home'

export function Profile() {
  const me = useMe().data!
  const { signOut } = useAuth()
  const qc = useQueryClient(); const toast = useToast()
  const m = me.member
  const [f, setF] = useState({ visible: m?.directory_visible ?? true, email: m?.directory_email ?? false, headline: m?.headline ?? '', linkedin: m?.linkedin_url ?? '' })
  const [keep, setKeep] = useState(remember.get())
  const [busy, setBusy] = useState(false)
  const [showOn, setShowOn] = useState(me.show_activity ?? true)
  const setActivity = async (v: boolean) => {
    setShowOn(v)
    const { error } = await supabase.rpc('member_set_activity', { p_show: v })
    if (error) { setShowOn(!v); toast.error(error); return }
    toast.ok(v ? 'Members can see when you are online.' : 'Your online status is now hidden.')
    qc.invalidateQueries({ queryKey: ['me'] }); qc.invalidateQueries({ queryKey: ['directory'] })
  }
  const name = m?.full_name ?? me.board?.full_name ?? ''
  const r = rankOf(me.total)
  const save = async () => {
    setBusy(true)
    const { error } = await supabase.rpc('member_update_profile', { p_visible: f.visible, p_show_email: f.email, p_headline: f.headline, p_linkedin: f.linkedin })
    setBusy(false)
    if (error) { toast.error(error); return }
    toast.ok('Saved.'); qc.invalidateQueries({ queryKey: ['me'] }); qc.invalidateQueries({ queryKey: ['directory'] })
  }
  return (
    <div className="page">
      <PageHead eyebrow="Account" title="My Profile" />
      <div className="two">
        <section className="panel">
          <div className="prof-head"><Avatar name={name} path={me.board?.avatar_url} size={64} /><div><strong>{name}</strong><small>{m?.email ?? me.board?.email}</small></div></div>
          <dl className="facts">
            {me.board && <><dt>E-board</dt><dd>{me.board.position_title}</dd></>}
            {me.major_roles.map((x) => <Fragment key={x.major}><dt>Major team</dt><dd>{MAJOR_ROLE[x.major_role] ?? x.major_role} · {x.major}</dd></Fragment>)}
            <dt>Major</dt><dd>{m?.major ?? me.board?.major ?? '—'}</dd>
            <dt>Class of</dt><dd>{m?.grad_year ?? me.board?.grad_year ?? '—'}</dd>
            {m && <><dt>Member since</dt><dd>{fmtDate(m.date_joined)}</dd></>}
            <dt>Rank</dt><dd className="mcard-rank"><Medal rank={r.rank.key} size={14} />{r.rank.name} · {me.total} stickers</dd>
            {m?.interests?.length ? <><dt>Interests</dt><dd>{m.interests.join(', ')}</dd></> : null}
          </dl>
          <p className="muted small">Need to change your name, major or email? Ask the Secretary.</p>
          <MemberCard me={me} />
        </section>
        <section className="panel form">
          <div className="panel-head"><h2>In the directory</h2></div>
          {m ? <>
            <label className="toggle"><input type="checkbox" checked={f.visible} onChange={(e) => setF({ ...f, visible: e.target.checked })} /><span className="tg" /><span><strong>Show me in the member directory</strong><small>Other members can see your name, major and class.</small></span></label>
            <label className="toggle"><input type="checkbox" checked={f.email} disabled={!f.visible} onChange={(e) => setF({ ...f, email: e.target.checked })} /><span className="tg" /><span><strong>Show my email to members</strong><small>Lets members contact you directly.</small></span></label>
            <label className="fld"><span>Headline <em className="opt-pill">Optional</em></span><input maxLength={120} value={f.headline} placeholder="e.g. Future CPA · Looking for summer internships" onChange={(e) => setF({ ...f, headline: e.target.value })} /></label>
            <label className="fld"><span>LinkedIn <em className="opt-pill">Optional</em></span><input inputMode="url" value={f.linkedin} placeholder="linkedin.com/in/your-name" onChange={(e) => setF({ ...f, linkedin: e.target.value })} /></label>
            <button className="btn btn-gold" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
          </> : <p className="muted small">Your e-board profile (photo, title) is managed in the E-Board Portal.</p>}
          <label className="toggle"><input type="checkbox" checked={showOn} onChange={(e) => void setActivity(e.target.checked)} /><span className="tg" /><span><strong>Show when I'm online</strong><small>A green dot and “Active 2 h ago” next to your name. Turn off to stay invisible.</small></span></label>
          <div className="panel-head sep"><h2>This device</h2></div>
          <label className="toggle"><input type="checkbox" checked={keep} onChange={(e) => { setKeep(e.target.checked); remember.set(e.target.checked) }} /><span className="tg" /><span><strong>Keep me signed in</strong><small>Turn off on shared computers. You will be signed out when the browser closes.</small></span></label>
          {me.board && <a className="btn btn-ghost btn-block" href="https://eboard.usjlps.org" target="_blank" rel="noopener noreferrer"><Icon name="board" size={16} />Open the E-Board Portal<Icon name="ext" size={13} /></a>}
          <button className="btn btn-ghost btn-block" onClick={() => signOut()}><Icon name="out" size={16} />Sign out</button>
        </section>
      </div>
    </div>
  )
}
