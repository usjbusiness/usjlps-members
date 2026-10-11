import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { COVERS, PHOTO_COVER_MIN, coverLock, defaultCover, isExecutive, isOnline, rankOf, seenLabel, useMe, useMemberPage, useAvatar, type PageInfo } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { fmtDate } from '@/lib/format'
import { shrinkImage } from '@/lib/image'
import { downloadPdf, type Resume } from '@/lib/resume'
import { supabase } from '@/lib/supabase'
import { Avatar, Empty, ErrorBox, Icon, Medal, Spinner, useToast } from '@/components/ui'
import { RankChip, merge, positions, showsRank, type Card } from './People'
import { Paper } from './Resume'

const EMPTY: PageInfo = { bio: null, cover: null, avatar_path: null, instagram: null, x_handle: null, tiktok: null, github: null, website: null, show_resume: false, show_attendance: true }

function fullResume(d: Record<string, unknown>): Resume {
  const base: Resume = { name: '', phone: '', email: '', location: '', linkedin: '', education: [], experience: [], projects: [], leadership: [],
    skills: { technical: '', languages: '', certifications: '', interests: '' }, honors: '', projectsFirst: false }
  return { ...base, ...(d as Partial<Resume>), skills: { ...base.skills, ...((d.skills as Resume['skills'] | undefined) ?? {}) } }
}

/** Cover ("header"): a preset gradient or an uploaded photo. */
function Cover({ cover, fallback, children }: { cover: string | null; fallback: string; children?: ReactNode }) {
  const photo = cover && !cover.startsWith('preset:') ? `member-media/${cover}` : null
  const src = useAvatar(photo).data
  const preset = cover?.startsWith('preset:') ? cover.slice(7) : fallback
  return (
    <div className={`pp-cover${photo ? ' is-photo' : ` cv-${preset}`}`} style={src ? { backgroundImage: `url("${src}")` } : undefined}>
      {!photo && preset === 'executive' && <span className="cv-exec-tag"><i />Executive Board<i /></span>}
      {children}
    </div>
  )
}

function links(c: Card, p: PageInfo) {
  const out: { icon: string; label: string; text: string; href: string }[] = []
  if (c.linkedin) out.push({ icon: 'linkedin', label: 'LinkedIn', text: c.linkedin.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), href: c.linkedin })
  if (p.instagram) out.push({ icon: 'insta', label: 'Instagram', text: `@${p.instagram}`, href: `https://instagram.com/${p.instagram}` })
  if (p.x_handle) out.push({ icon: 'xlogo', label: 'X', text: `@${p.x_handle}`, href: `https://x.com/${p.x_handle}` })
  if (p.tiktok) out.push({ icon: 'tiktok', label: 'TikTok', text: `@${p.tiktok}`, href: `https://www.tiktok.com/@${p.tiktok}` })
  if (p.github) out.push({ icon: 'github', label: 'GitHub', text: p.github, href: `https://github.com/${p.github}` })
  if (p.website) out.push({ icon: 'globe', label: 'Website', text: p.website.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, ''), href: p.website })
  if (c.email) out.push({ icon: 'mail', label: 'Email', text: c.email, href: `mailto:${c.email}` })
  return out
}

export function PersonPage() {
  const { key = 'me' } = useParams()
  const q = useMemberPage(key)
  const meQ = useMe().data
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<PageInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const toast = useToast()
  useEffect(() => { setEditing(false); setDraft(null); window.scrollTo(0, 0) }, [key])
  const card = useMemo(() => (q.data ? merge(q.data.rows)[0] ?? null : null), [q.data])

  if (q.isLoading) return <div className="page"><Spinner /></div>
  if (q.error) return <div className="page"><ErrorBox error={q.error} retry={() => q.refetch()} /></div>
  if (!q.data || !card) return <div className="page"><Empty icon="people" title="Page not found" body="This person is not in the directory, or chose to hide their profile." action={<Link className="btn btn-ghost" to="/people">Back to Members</Link>} /></div>

  const d = q.data
  const page = draft ?? d.page ?? EMPTY
  const total = Math.max(d.total, card.total)
  const r = rankOf(total)
  const on = !d.is_me && isOnline(card.seen)
  const seen = d.is_me ? null : seenLabel(card.seen)
  const ls = links(card, page)
  const roles = positions(card)
  const resume = d.resume ? fullResume(d.resume) : null
  const pdf = async () => {
    if (!resume) return
    setBusy(true)
    try { await downloadPdf(resume); toast.ok('PDF downloaded.') } catch (e) { toast.error(e) } finally { setBusy(false) }
  }

  return (
    <div className="page pp">
      <Link to="/people" className="link pp-back"><Icon name="back" size={15} />Members</Link>
      <section className="pp-hero">
        <Cover cover={page.cover} fallback={defaultCover(total, d.is_me && meQ ? isExecutive(meQ) : card.kind === 'eboard')} />
        <div className="pp-id">
          <Avatar name={card.name} path={draft ? (draft.avatar_path ? `member-media/${draft.avatar_path}` : (d.page?.avatar_path ? null : card.avatar)) : card.avatar} size={116} ring={card.badges[0]?.color} online={on} />
          <div className="pp-name">
            <h1>{card.name}{d.is_me && <em className="you">You</em>}</h1>
            {roles.length > 0 && <div className="badges">{roles.map((b) => <span key={b.label} className={`role${b.dashed ? ' is-dashed' : ''}`} style={{ ['--rc' as string]: b.color }}><i />{b.label}</span>)}</div>}{showsRank(card) && <div className="rank-row"><RankChip total={total} big /></div>}
            {card.headline && <p className="pp-headline">{card.headline}</p>}
            <p className="pp-meta">{[card.major, card.year ? `Class of ${card.year}` : null].filter(Boolean).join(' · ')}{seen && <span className={`seen${on ? ' is-on' : ''}`}><i />{seen}</span>}</p>
          </div>
          <div className="pp-actions">
            {d.is_me
              ? !editing && <button className="btn btn-gold" onClick={() => { setDraft({ ...EMPTY, ...(d.page ?? {}) }); setEditing(true) }}><Icon name="edit" size={16} />Edit my page</button>
              : <>
                  {card.linkedin && <a className="btn btn-ghost" href={card.linkedin} target="_blank" rel="noopener noreferrer"><Icon name="linkedin" size={16} />LinkedIn</a>}
                  {card.email && <a className="btn btn-ghost" href={`mailto:${card.email}`}><Icon name="mail" size={16} />Email</a>}
                </>}
          </div>
        </div>
      </section>

      {editing && draft && <Editor d={draft} old={d.page} set={setDraft} card={card} hasResume={d.has_resume || !!d.resume} done={() => { setEditing(false); setDraft(null) }} />}

      <div className="pp-grid">
        <aside className="pp-side">
          {showsRank(card) && (
            <section className="panel pp-rank">
              <Medal rank={r.rank.key} size={54} />
              <div><small>Rank</small><strong>{r.rank.name}</strong><span>{total} sticker{total === 1 ? '' : 's'}{r.next ? ` · ${r.toNext} to ${r.next.name}` : ''}</span></div>
            </section>
          )}
          <section className="panel pp-facts">
            <dl>
              {d.attendance && <>
                <dt>General Meetings</dt><dd>{d.attendance.attended} attended</dd>
                <dt>Last General Meeting</dt>
                <dd>{d.attendance.last ? <><strong>{d.attendance.last.title}</strong><small>{fmtDate(d.attendance.last.starts_at)}{d.attendance.last.headliner ? ' · Headliner' : ''}</small></> : 'None yet'}</dd>
              </>}
              {d.member_since && <><dt>Member since</dt><dd>{fmtDate(d.member_since, { month: 'long', year: 'numeric' })}</dd></>}
              {card.interests.length > 0 && <><dt>Interests</dt><dd className="pp-tags">{card.interests.map((t) => <span key={t}>{t}</span>)}</dd></>}
            </dl>
            {d.is_me && page.show_attendance === false && <p className="muted small">Your attendance is hidden from other members.</p>}
          </section>
          {ls.length > 0 && (
            <section className="panel pp-links">
              <h2>Links</h2>
              {ls.map((l) => <a key={l.label} href={l.href} target={l.href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer"><Icon name={l.icon} size={18} /><span><small>{l.label}</small>{l.text}</span><Icon name="ext" size={13} /></a>)}
            </section>
          )}
        </aside>
        <main className="pp-main">
          <section className="panel pp-about">
            <div className="panel-head"><h2>About</h2></div>
            {page.bio ? <p className="pp-bio">{page.bio}</p> : <p className="muted">{d.is_me ? 'Add a few lines about yourself: what you study, what you are looking for, what you love.' : `${card.name.split(' ')[0]} has not written a bio yet.`}</p>}
          </section>
          <section className="panel pp-resume">
            <div className="panel-head">
              <h2>Résumé</h2>
              {resume && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => void pdf()}><Icon name="download" size={15} />{busy ? 'Preparing…' : 'Download PDF'}</button>}
            </div>
            {d.is_me && resume && !page.show_resume && <p className="pp-note"><Icon name="lock" size={14} />Only you can see this. Turn on “Show my résumé” in Edit my page to share it with members.</p>}
            {resume ? <Paper r={resume} />
              : d.is_me ? <Empty icon="resume" title="No résumé yet" body="Build one in minutes in the USJ format." action={<Link className="btn btn-gold" to="/resume">Open Résumé Builder</Link>} />
              : <p className="muted">{card.name.split(' ')[0]} has not shared a résumé.</p>}
          </section>
        </main>
      </div>
    </div>
  )
}

function Editor({ d, old, set, card, hasResume, done }: { d: PageInfo; old: PageInfo | null; set: (p: PageInfo) => void; card: Card; hasResume: boolean; done: () => void }) {
  const me = useMe().data!
  const { session } = useAuth()
  const qc = useQueryClient(); const toast = useToast()
  const m = me.member
  const [prof, setProf] = useState({ headline: m?.headline ?? '', linkedin: m?.linkedin_url ?? '' })
  const [busy, setBusy] = useState<'' | 'cover' | 'avatar' | 'save'>('')
  const coverIn = useRef<HTMLInputElement>(null); const avatarIn = useRef<HTMLInputElement>(null)
  const uploaded = useRef<string[]>([])
  const p = (x: Partial<PageInfo>) => set({ ...d, ...x })
  const uid = session?.user.id

  const upload = async (file: File | undefined, kind: 'cover' | 'avatar') => {
    if (!file || !uid) return
    setBusy(kind)
    try {
      const blob = await shrinkImage(file, kind === 'cover' ? 2000 : 640, kind === 'cover' ? 1200 : 640, kind === 'avatar')
      const path = `${uid}/${kind}-${Date.now().toString(36)}.jpg`
      const { error } = await supabase.storage.from('member-media').upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
      if (error) throw error
      uploaded.current.push(path)
      p(kind === 'cover' ? { cover: path } : { avatar_path: path })
    } catch (e) { toast.error(e) } finally { setBusy('') }
  }

  const save = async () => {
    if (!uid) return
    setBusy('save')
    try {
      const row = { user_id: uid, bio: d.bio, cover: d.cover, avatar_path: d.avatar_path, instagram: d.instagram, x_handle: d.x_handle, tiktok: d.tiktok, github: d.github, website: d.website, show_resume: d.show_resume, show_attendance: d.show_attendance }
      const { error } = await supabase.from('member_pages').upsert(row, { onConflict: 'user_id' })
      if (error) throw error
      if (m && (prof.headline !== (m.headline ?? '') || prof.linkedin !== (m.linkedin_url ?? ''))) {
        const { error: e2 } = await supabase.rpc('member_update_profile', { p_visible: m.directory_visible, p_show_email: m.directory_email, p_headline: prof.headline, p_linkedin: prof.linkedin })
        if (e2) throw e2
      }
      // Remove photos that are no longer used.
      const keep = new Set([d.cover, d.avatar_path])
      const drop = [...uploaded.current, old?.cover && !old.cover.startsWith('preset:') ? old.cover : null, old?.avatar_path ?? null].filter((x): x is string => !!x && !keep.has(x))
      if (drop.length) void supabase.storage.from('member-media').remove([...new Set(drop)])
      await Promise.all(['page', 'directory', 'me'].map((k) => qc.invalidateQueries({ queryKey: [k] })))
      toast.ok('Your page is saved.'); done()
    } catch (e) { toast.error(e) } finally { setBusy('') }
  }
  const cancel = () => {
    if (uploaded.current.length) void supabase.storage.from('member-media').remove(uploaded.current)
    done()
  }
  const exec = isExecutive(me)
  const preset = d.cover?.startsWith('preset:') ? d.cover.slice(7) : d.cover ? null : defaultCover(me.total, exec)
  const photoLocked = !exec && me.total < PHOTO_COVER_MIN

  return (
    <section className="panel pp-edit form">
      <div className="panel-head"><h2>Edit my page</h2><span className="muted small">Visible to LPS members only</span></div>
      <div className="pp-edit-grid">
        <div>
          <h3>Header</h3>
          <div className="cover-pick">
            {COVERS.filter((c) => !('board' in c) || exec).map((c) => {
              const lock = coverLock(c.key, me.total, exec)
              return (
                <button key={c.key} type="button" className={`cover-opt${preset === c.key ? ' on' : ''}${lock ? ' is-locked' : ''}`} disabled={!!lock}
                  onClick={() => p({ cover: `preset:${c.key}` })} title={lock ? `Unlocks at ${lock.replace(' · ', ' (')} stickers)` : c.label}>
                  <span className={`sw cv-${c.key}`}>{lock ? <Icon name="lock" size={15} /> : preset === c.key ? <Icon name="check" size={16} /> : null}</span>
                  <b>{c.label}</b><small>{lock ?? (c.key === 'executive' ? 'E-Board' : c.min ? 'Unlocked' : 'Everyone')}</small>
                </button>
              )
            })}
          </div>
          <button type="button" className={`cover-up${!preset ? ' on' : ''}`} disabled={busy === 'cover' || photoLocked} onClick={() => coverIn.current?.click()}>
            <Icon name={photoLocked ? 'lock' : 'camera'} size={16} />{busy === 'cover' ? 'Uploading…' : photoLocked ? 'Own header photo · unlocks at Gold' : 'Upload my own photo'}
          </button>
          <small className="hint">New headers unlock as you earn stickers. {photoLocked ? 'At Gold you can upload your own photo.' : 'A wide photo works best (for example 1500 × 500).'}</small>
          <input ref={coverIn} type="file" accept="image/*" hidden onChange={(e) => { void upload(e.target.files?.[0], 'cover'); e.target.value = '' }} />

          <h3>Profile photo</h3>
          <div className="row-gap">
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy === 'avatar'} onClick={() => avatarIn.current?.click()}><Icon name="camera" size={15} />{busy === 'avatar' ? 'Uploading…' : d.avatar_path ? 'Change photo' : 'Upload photo'}</button>
            {d.avatar_path && <button type="button" className="link" onClick={() => p({ avatar_path: null })}>Remove photo</button>}
          </div>
          {!d.avatar_path && card.kind !== 'member' && <small className="hint">Without an upload, your E-Board Portal photo is used.</small>}
          <input ref={avatarIn} type="file" accept="image/*" hidden onChange={(e) => { void upload(e.target.files?.[0], 'avatar'); e.target.value = '' }} />

          {m && <>
            <h3>Headline and LinkedIn</h3>
            <label className="fld"><span>Headline</span><input maxLength={120} value={prof.headline} placeholder="e.g. Future CPA · Looking for summer internships" onChange={(e) => setProf({ ...prof, headline: e.target.value })} /></label>
            <label className="fld"><span>LinkedIn</span><input inputMode="url" value={prof.linkedin} placeholder="linkedin.com/in/your-name" onChange={(e) => setProf({ ...prof, linkedin: e.target.value })} /></label>
          </>}
        </div>
        <div>
          <h3>About</h3>
          <label className="fld"><span>Bio <em className="opt-pill">{(d.bio ?? '').length}/800</em></span><textarea rows={5} maxLength={800} value={d.bio ?? ''} placeholder="What you study, what you are looking for, what you love." onChange={(e) => p({ bio: e.target.value })} /></label>
          <h3>Social links</h3>
          <div className="soc-grid">
            <label className="fld"><span><Icon name="insta" size={13} />Instagram</span><input value={d.instagram ?? ''} placeholder="@username" onChange={(e) => p({ instagram: e.target.value })} /></label>
            <label className="fld"><span><Icon name="xlogo" size={13} />X</span><input value={d.x_handle ?? ''} placeholder="@username" onChange={(e) => p({ x_handle: e.target.value })} /></label>
            <label className="fld"><span><Icon name="tiktok" size={13} />TikTok</span><input value={d.tiktok ?? ''} placeholder="@username" onChange={(e) => p({ tiktok: e.target.value })} /></label>
            <label className="fld"><span><Icon name="github" size={13} />GitHub</span><input value={d.github ?? ''} placeholder="username" onChange={(e) => p({ github: e.target.value })} /></label>
          </div>
          <label className="fld"><span><Icon name="globe" size={13} />Website</span><input inputMode="url" value={d.website ?? ''} placeholder="yourname.com" onChange={(e) => p({ website: e.target.value })} /></label>
          <h3>Privacy</h3>
          <label className="toggle"><input type="checkbox" checked={d.show_resume} onChange={(e) => p({ show_resume: e.target.checked })} /><span className="tg" /><span><strong>Show my résumé</strong><small>{hasResume ? 'Members can view and download it, including the phone and email on it.' : 'Build your résumé first in the Résumé Builder.'}</small></span></label>
          <label className="toggle"><input type="checkbox" checked={d.show_attendance} onChange={(e) => p({ show_attendance: e.target.checked })} /><span className="tg" /><span><strong>Show my attendance</strong><small>General Meetings attended and the last one you came to.</small></span></label>
        </div>
      </div>
      <div className="pp-edit-bar">
        <button className="btn btn-ghost" onClick={cancel} disabled={busy === 'save'}>Cancel</button>
        <button className="btn btn-gold" onClick={() => void save()} disabled={!!busy}>{busy === 'save' ? 'Saving…' : 'Save my page'}</button>
      </div>
    </section>
  )
}
