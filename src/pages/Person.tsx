import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { COVERS, PHOTO_COVER_MIN, coverLock, defaultCover, isExecutive, isOnline, seenLabel, useMe, useMemberPage, type MemberPage, type PageInfo, type PublicSettings } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { shrinkImage } from '@/lib/image'
import { OPEN_TO, PRONOUNS, fromResume, imagesOf, isEmptyProfile, mergeImport, type Entry, type ListKey, type Profile } from '@/lib/profile'
import { publicUrl, qrSvg, downloadQrPng } from '@/lib/qr'
import { downloadPdf, type Resume } from '@/lib/resume'
import { supabase } from '@/lib/supabase'
import { Empty, ErrorBox, Icon, Modal, Spinner, useToast } from '@/components/ui'
import { AllSections, DEF, EntryModal, Hero, LangsModal, LinksBox, ORDER, SkillsModal, VerifiedBox, linkList, type Owner } from '@/components/ProfileView'
import { merge, positions, showsRank, type Card } from './People'
import { Paper } from './Resume'

const EMPTY: PageInfo = { bio: null, cover: null, avatar_path: null, instagram: null, x_handle: null, tiktok: null, github: null, website: null, show_resume: false, show_attendance: true, profile: {} }

export function fullResume(d: Record<string, unknown>): Resume {
  const base: Resume = { name: '', phone: '', email: '', location: '', linkedin: '', education: [], experience: [], projects: [], leadership: [],
    skills: { technical: '', languages: '', certifications: '', interests: '' }, honors: '', projectsFirst: false }
  return { ...base, ...(d as Partial<Resume>), skills: { ...base.skills, ...((d.skills as Resume['skills'] | undefined) ?? {}) } }
}

export function ResumeBox({ resume, mine, shared, name }: { resume: Resume | null; mine: boolean; shared: boolean; name: string }) {
  const toast = useToast(); const [busy, setBusy] = useState(false)
  if (!resume && !mine) return null
  return (
    <section className="panel pp-resume">
      <div className="panel-head">
        <h2>Résumé</h2>
        {resume && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={async () => { setBusy(true); try { await downloadPdf(resume); toast.ok('PDF downloaded.') } catch (e) { toast.error(e) } finally { setBusy(false) } }}><Icon name="download" size={15} />{busy ? 'Preparing…' : 'Download PDF'}</button>}
      </div>
      {mine && resume && !shared && <p className="pp-note"><Icon name="lock" size={14} />Only you can see this. Turn on “Show my résumé” in Edit my page to share it with members.</p>}
      {resume ? <Paper r={resume} /> : <Empty icon="resume" title="No résumé yet" body={`Build one in minutes in the USJ format${name ? '' : ''}.`} action={<Link className="btn btn-gold" to="/resume">Open Résumé Builder</Link>} />}
    </section>
  )
}

/** Saves profile sections and removes photos that are no longer used. */
function useSaveProfile(prev: Profile) {
  const { session } = useAuth(); const qc = useQueryClient()
  return async (next: Profile) => {
    const uidv = session?.user.id
    if (!uidv) throw new Error('Please sign in again.')
    const { error } = await supabase.from('member_pages').upsert({ user_id: uidv, profile: next }, { onConflict: 'user_id' })
    if (error) throw error
    const keep = new Set(imagesOf(next)); const drop = imagesOf(prev).filter((x) => !keep.has(x))
    if (drop.length) void supabase.storage.from('member-media').remove(drop)
    await qc.invalidateQueries({ queryKey: ['page'] })
  }
}

function slugify(name: string) {
  const s = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '')
  return s.length >= 3 ? s : `${s || 'member'}-lps`
}

function QrModal({ slug, name, onClose }: { slug: string; name: string; onClose: () => void }) {
  const toast = useToast(); const url = publicUrl(slug)
  const q = useMemo(() => qrSvg(url), [url])
  return (
    <Modal title="QR code for your page" onClose={onClose} foot={<><span className="grow" /><button className="btn btn-ghost" onClick={onClose}>Close</button><button className="btn btn-gold" onClick={() => void downloadQrPng(url, name).catch((e) => toast.error(e))}><Icon name="download" size={15} />Download PNG</button></>}>
      <div className="qr-card">
        <div className="qr-box">
          <svg viewBox={`-2 -2 ${q.n + 4} ${q.n + 4}`} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${url}`}><rect x="-2" y="-2" width={q.n + 4} height={q.n + 4} fill="#fff" /><path d={q.d} fill="#0A0A0A" /></svg>
          <img src="/icons/icon-192.png" alt="" style={{ left: `${((q.h0 + 2 + q.hole * 0.06) / (q.n + 4)) * 100}%`, top: `${((q.h0 + 2 + q.hole * 0.06) / (q.n + 4)) * 100}%`, width: `${((q.hole * 0.88) / (q.n + 4)) * 100}%` }} />
        </div>
        <strong>{name}</strong><small>{url.replace('https://', '')}</small>
      </div>
      <p className="muted small">Print it on a business card, a poster or the last line of your résumé. Anyone who scans it opens your public page.</p>
    </Modal>
  )
}

function PublicModal({ pub, name, hasResume, onClose }: { pub: Partial<PublicSettings>; name: string; hasResume: boolean; onClose: () => void }) {
  const { session } = useAuth(); const qc = useQueryClient(); const toast = useToast()
  const [f, setF] = useState({ on: pub.is_public ?? false, slug: pub.slug ?? slugify(name), resume: pub.public_resume ?? false, email: pub.public_email ?? false, search: pub.searchable ?? false })
  const [busy, setBusy] = useState(false)
  const slugOk = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(f.slug)
  const save = async () => {
    if (!slugOk) { toast.error('The link can use a–z, 0–9 and dashes (3 to 40 characters).'); return }
    setBusy(true)
    const { error } = await supabase.from('member_pages').upsert({ user_id: session!.user.id, slug: f.slug, is_public: f.on, public_resume: f.resume, public_email: f.email, searchable: f.search }, { onConflict: 'user_id' })
    setBusy(false)
    if (error) { toast.error(error); return }
    await qc.invalidateQueries({ queryKey: ['page'] }); await qc.invalidateQueries({ queryKey: ['public'] })
    toast.ok(f.on ? 'Your public page is live.' : 'Saved. Your page is visible to members only.'); onClose()
  }
  return (
    <Modal title="Public page" onClose={onClose} foot={<><span className="grow" /><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-gold" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <p className="muted small">A public page lets employers, recruiters and anyone with the link see your profile, even without an LPS account. You decide what is shown and can turn it off at any time.</p>
      <label className="toggle"><input type="checkbox" checked={f.on} onChange={(e) => setF({ ...f, on: e.target.checked })} /><span className="tg" /><span><strong>Make my page public</strong><small>Your header, photo, headline, about, links, sections and the “Verified by USJ LPS” box.</small></span></label>
      <label className="fld slug-f"><span>Your link</span><span className="slug-in"><em>members.usjlps.org/u/</em><input value={f.slug} maxLength={40} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} /></span>{!slugOk && <small className="err">3 to 40 characters: a–z, 0–9 and dashes.</small>}</label>
      <label className="toggle"><input type="checkbox" checked={f.resume} disabled={!hasResume} onChange={(e) => setF({ ...f, resume: e.target.checked })} /><span className="tg" /><span><strong>Show my résumé publicly</strong><small>{hasResume ? 'Visitors can view and download it, including the phone number and email written on it.' : 'Build your résumé first in the Résumé Builder.'}</small></span></label>
      <label className="toggle"><input type="checkbox" checked={f.email} onChange={(e) => setF({ ...f, email: e.target.checked })} /><span className="tg" /><span><strong>Show my email</strong><small>Adds your LPS email under Contact so recruiters can reach you.</small></span></label>
      <label className="toggle"><input type="checkbox" checked={f.search} onChange={(e) => setF({ ...f, search: e.target.checked })} /><span className="tg" /><span><strong>Let Google find my page</strong><small>Off: only people with the link can open it.</small></span></label>
      <p className="muted small">Never public: your online status, notes, merch requests and anything the e-board keeps internal.</p>
    </Modal>
  )
}

function PublicBox({ pub, name, hasResume }: { pub: Partial<PublicSettings>; name: string; hasResume: boolean }) {
  const toast = useToast(); const [m, setM] = useState<'' | 'set' | 'qr'>('')
  const live = !!pub.is_public && !!pub.slug && !pub.blocked
  const url = pub.slug ? publicUrl(pub.slug) : ''
  const copy = async () => { try { await navigator.clipboard.writeText(url); toast.ok('Link copied.') } catch { window.prompt('Copy your link', url) } }
  const share = async () => { if (navigator.share) { try { await navigator.share({ title: `${name} · USJ LPS`, url }) } catch { /* cancelled */ } } else void copy() }
  return (
    <section className="panel pp-public">
      <div className="panel-head"><h2>Public page</h2><span className={`pub-state${live ? ' is-on' : ''}`}><i />{pub.blocked ? 'Turned off by e-board' : live ? 'Live' : 'Off'}</span></div>
      {pub.blocked ? <p className="muted small">The e-board turned off your public page. Contact the e-board if you think this is a mistake.</p>
        : live ? <>
          <a className="pub-link" href={`/u/${pub.slug}`} target="_blank" rel="noopener noreferrer"><Icon name="globe" size={15} /><span>{url.replace('https://', '')}</span><Icon name="ext" size={13} /></a>
          <div className="pub-btns">
            <button className="btn btn-ghost btn-sm" onClick={() => void copy()}><Icon name="copy" size={14} />Copy</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setM('qr')}><Icon name="qr" size={14} />QR code</button>
            <button className="btn btn-ghost btn-sm" onClick={() => void share()}><Icon name="share" size={14} />Share</button>
          </div>
          <p className="pub-views"><Icon name="eye" size={14} />{pub.views ?? 0} view{pub.views === 1 ? '' : 's'} from the public link</p>
          <p className="muted small">Tip: add this link to LinkedIn (Contact info → Website) and to your résumé.</p>
        </> : <p className="muted small">Share your page with employers through a link and a QR code. Only what you choose is shown.</p>}
      {!pub.blocked && <button className={`btn btn-block ${live ? 'btn-ghost' : 'btn-gold'}`} onClick={() => setM('set')}><Icon name={live ? 'edit' : 'globe'} size={15} />{live ? 'Public page settings' : 'Create my public link'}</button>}
      {m === 'set' && <PublicModal pub={pub} name={name} hasResume={hasResume} onClose={() => setM('')} />}
      {m === 'qr' && pub.slug && <QrModal slug={pub.slug} name={name} onClose={() => setM('')} />}
    </section>
  )
}

function AddSection({ owner, resume, profile }: { owner: Owner; resume: Resume | null; profile: Profile }) {
  const toast = useToast(); const save = useSaveProfile(profile); const [busy, setBusy] = useState(false)
  const imp = async () => {
    if (!resume) return
    const { next, added } = mergeImport(profile, fromResume(resume))
    if (!added) { toast.ok('Everything from your résumé is already on your page.'); return }
    if (!window.confirm(`Add ${added} item${added === 1 ? '' : 's'} from your résumé to your page? You can edit or delete them after.`)) return
    setBusy(true)
    try { await save(next); toast.ok(`Added ${added} item${added === 1 ? '' : 's'} from your résumé.`) } catch (e) { toast.error(e) } finally { setBusy(false) }
  }
  return (
    <section className="panel pp-add">
      <div className="panel-head"><h2>{isEmptyProfile(profile) ? 'Build your profile' : 'Add profile section'}</h2></div>
      <p className="muted small">Like LinkedIn: where you worked, where you studied, certificates, projects and more. Add logos so your page looks professional.</p>
      <div className="add-grid">
        {ORDER.map((k) => <button key={k} className="add-chip" onClick={() => owner.edit(k, null)}><Icon name={DEF[k].icon} size={16} />{DEF[k].title}</button>)}
        <button className="add-chip" onClick={owner.skills}><Icon name="star" size={16} />Skills</button>
        <button className="add-chip" onClick={owner.langs}><Icon name="lang" size={16} />Languages</button>
      </div>
      {resume && <button className="btn btn-ghost btn-block" disabled={busy} onClick={() => void imp()}><Icon name="resume" size={15} />{busy ? 'Importing…' : 'Import from my résumé'}</button>}
    </section>
  )
}

export function PersonPage() {
  const { key = 'me' } = useParams()
  const q = useMemberPage(key)
  const meQ = useMe().data
  const { session } = useAuth()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<PageInfo | null>(null)
  const [modal, setModal] = useState<null | { t: 'entry'; k: ListKey; e: Entry | null } | { t: 'skills' } | { t: 'langs' }>(null)
  useEffect(() => { setEditing(false); setDraft(null); setModal(null); window.scrollTo(0, 0) }, [key])
  const card = useMemo(() => (q.data ? merge(q.data.rows)[0] ?? null : null), [q.data])
  const profile: Profile = (q.data?.page?.profile ?? {}) as Profile
  const save = useSaveProfile(profile)

  if (q.isLoading) return <div className="page"><Spinner /></div>
  if (q.error) return <div className="page"><ErrorBox error={q.error} retry={() => q.refetch()} /></div>
  if (!q.data || !card) return <div className="page"><Empty icon="people" title="Page not found" body="This person is not in the directory, or chose to hide their profile." action={<Link className="btn btn-ghost" to="/people">Back to Members</Link>} /></div>

  const d: MemberPage = q.data
  const page = draft ?? { ...EMPTY, ...(d.page ?? {}) }
  const total = Math.max(d.total, card.total)
  const on = !d.is_me && isOnline(card.seen)
  const seen = d.is_me ? null : seenLabel(card.seen)
  const roles = positions(card)
  const resume = d.resume ? fullResume(d.resume) : null
  const exec = d.is_me && meQ ? isExecutive(meQ) : card.kind === 'eboard'
  const pub = d.public
  const links = linkList({ linkedin: card.linkedin, email: card.email, ...page })
  if (!d.is_me && pub?.slug) links.push({ icon: 'globe', label: 'Public page', text: `members.usjlps.org/u/${pub.slug}`, href: `/u/${pub.slug}` })
  const owner: Owner | undefined = d.is_me ? { edit: (k, e) => setModal({ t: 'entry', k, e }), skills: () => setModal({ t: 'skills' }), langs: () => setModal({ t: 'langs' }) } : undefined
  const saveEntry = (k: ListKey) => async (e: Entry | null, old: Entry | null) => {
    const list = [...((profile[k] ?? []) as Entry[])]
    const i = old ? list.findIndex((x) => x.id === old.id) : -1
    if (e === null) { if (i >= 0) list.splice(i, 1) } else if (i >= 0) list[i] = e; else list.push(e)
    await save({ ...profile, [k]: list })
  }

  return (
    <div className="page pp">
      <Link to="/people" className="link pp-back"><Icon name="back" size={15} />Members</Link>
      <Hero name={card.name} ring={card.badges[0]?.color} online={on} roles={roles} total={total} showRank={showsRank(card)} headline={card.headline}
        avatar={draft ? (draft.avatar_path ? `member-media/${draft.avatar_path}` : (d.page?.avatar_path ? null : card.avatar)) : card.avatar}
        meta={[card.major, card.year ? `Class of ${card.year}` : null].filter(Boolean).join(' · ')} seen={seen && <span className={`seen${on ? ' is-on' : ''}`}><i />{seen}</span>}
        cover={page.cover} fallback={defaultCover(total, exec)} profile={(draft?.profile ?? profile) as Profile} me={d.is_me}
        actions={d.is_me
          ? !editing && <button className="btn btn-gold" onClick={() => { setDraft({ ...EMPTY, ...(d.page ?? {}), profile: { ...profile } }); setEditing(true) }}><Icon name="edit" size={16} />Edit my page</button>
          : <>
              {card.linkedin && <a className="btn btn-ghost" href={card.linkedin} target="_blank" rel="noopener noreferrer"><Icon name="linkedin" size={16} />LinkedIn</a>}
              {card.email && <a className="btn btn-ghost" href={`mailto:${card.email}`}><Icon name="mail" size={16} />Email</a>}
            </>} />

      {editing && draft && <Editor d={draft} old={d.page} set={setDraft} card={card} hasResume={d.has_resume || !!d.resume} done={() => { setEditing(false); setDraft(null) }} />}

      <div className="pp-grid">
        <aside className="pp-side">
          <VerifiedBox total={total} showRank={showsRank(card)} attendance={d.attendance} since={d.member_since} roles={roles} />
          {d.is_me && pub && <PublicBox pub={pub} name={card.name} hasResume={!!d.resume} />}
          <LinksBox links={links} />
          {d.is_me && page.show_attendance === false && <p className="muted small pp-hidden-note">Your attendance is hidden from other members.</p>}
        </aside>
        <main className="pp-main">
          <section className="panel pp-about">
            <div className="panel-head"><h2>About</h2></div>
            {page.bio ? <p className="pp-bio">{page.bio}</p> : <p className="muted">{d.is_me ? 'Add a few lines about yourself: what you study, what you are looking for, what you love.' : `${card.name.split(' ')[0]} has not written a bio yet.`}</p>}
          </section>
          <AllSections profile={profile} owner={owner} />
          {owner && <AddSection owner={owner} resume={resume} profile={profile} />}
          <ResumeBox resume={resume} mine={d.is_me} shared={!!page.show_resume} name={card.name} />
          {!d.is_me && !resume && <p className="muted small">{card.name.split(' ')[0]} has not shared a résumé.</p>}
        </main>
      </div>

      {modal?.t === 'entry' && session && <EntryModal k={modal.k} entry={modal.e} userId={session.user.id} onSave={saveEntry(modal.k)} onClose={() => setModal(null)} />}
      {modal?.t === 'skills' && <SkillsModal skills={profile.skills ?? []} onSave={(s) => save({ ...profile, skills: s })} onClose={() => setModal(null)} />}
      {modal?.t === 'langs' && <LangsModal langs={profile.languages ?? []} onSave={(l) => save({ ...profile, languages: l })} onClose={() => setModal(null)} />}
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
      const row = { user_id: uid, profile: { ...(old?.profile ?? {}), pronouns: d.profile?.pronouns || undefined, location: d.profile?.location?.trim() || undefined, open_to: d.profile?.open_to ?? [] }, bio: d.bio, cover: d.cover, avatar_path: d.avatar_path, instagram: d.instagram, x_handle: d.x_handle, tiktok: d.tiktok, github: d.github, website: d.website, show_resume: d.show_resume, show_attendance: d.show_attendance }
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
          <h3>Basics</h3>
          <div className="soc-grid">
            <label className="fld"><span>Pronouns</span><select value={d.profile?.pronouns ?? ''} onChange={(e) => p({ profile: { ...(d.profile ?? {}), pronouns: e.target.value } })}><option value="">Not shown</option>{PRONOUNS.map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="fld"><span>Location</span><input maxLength={60} value={d.profile?.location ?? ''} placeholder="e.g. West Hartford, CT" onChange={(e) => p({ profile: { ...(d.profile ?? {}), location: e.target.value } })} /></label>
          </div>
          <span className="fld-lab">Open to</span>
          <div className="chips-pick">{OPEN_TO.map((o) => { const on = (d.profile?.open_to ?? []).includes(o.key)
            return <button key={o.key} type="button" className={`fchip${on ? ' on' : ''}`} onClick={() => p({ profile: { ...(d.profile ?? {}), open_to: on ? (d.profile?.open_to ?? []).filter((x) => x !== o.key) : [...(d.profile?.open_to ?? []), o.key] } })}>{on && <Icon name="check" size={13} />}{o.label}</button> })}</div>
          <small className="hint">Adds an “Open to work” ring to your photo, like on LinkedIn.</small>
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
