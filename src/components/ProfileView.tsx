// Shared pieces of a member page: used inside the portal (/people/:key) and on the public link (/u/:slug).
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { MAJOR_ROLE, ROLE_COLOR, rankOf, useAvatar, type MemberPage } from '@/lib/api'
import { fmtDate, initials } from '@/lib/format'
import { logoImage, shrinkImage } from '@/lib/image'
import { EMPLOYMENT, LANG_LEVELS, MONTHS, OPEN_TO, fmtYm, prettyUrl, safeUrl, sorted, span, uid, type Entry, type Lang, type ListKey, type Profile } from '@/lib/profile'
import { supabase } from '@/lib/supabase'
import { Avatar, Icon, Medal, Modal, useToast } from './ui'

export interface Badge { label: string; color: string; dashed?: boolean }
export function positionBadges(ps: { kind: string; title: string | null; role: string | null; major?: string | null }[]): Badge[] {
  return ps.map((p) => p.kind === 'major'
    ? { label: `${MAJOR_ROLE[p.role ?? ''] ?? 'Major Team'}${p.major ? ` · ${p.major}` : ''}`, color: ROLE_COLOR.major_lead, dashed: true }
    : { label: p.title || 'E-Board', color: ROLE_COLOR[p.role ?? ''] ?? '#C9A54C' })
}
export function RankChip({ total, big }: { total: number; big?: boolean }) {
  const r = rankOf(total).rank
  return <span className={`rank-chip r-${r.key}${big ? ' is-big' : ''}`} title={`${r.name} · ${total} sticker${total === 1 ? '' : 's'}`}><Medal rank={r.key} size={big ? 18 : 13} />{r.name}</span>
}

/** Cover ("header"): a preset or an uploaded photo. */
export function Cover({ cover, fallback }: { cover: string | null; fallback: string }) {
  const photo = cover && !cover.startsWith('preset:') ? `member-media/${cover}` : null
  const src = useAvatar(photo).data
  const preset = cover?.startsWith('preset:') ? cover.slice(7) : fallback
  return (
    <div className={`pp-cover${photo ? ' is-photo' : ` cv-${preset}`}`} style={src ? { backgroundImage: `url("${src}")` } : undefined}>
      {!photo && preset === 'executive' && <span className="cv-exec-tag"><i />Executive Board<i /></span>}
    </div>
  )
}

export function Hero(p: { name: string; avatar: string | null; ring?: string; online?: boolean; roles: Badge[]; total: number; showRank: boolean; headline: string | null
  meta: string; seen?: ReactNode; cover: string | null; fallback: string; profile: Profile; me?: boolean; actions?: ReactNode }) {
  const open = (p.profile.open_to ?? []).map((k) => OPEN_TO.find((o) => o.key === k)?.label).filter(Boolean) as string[]
  return (
    <section className="pp-hero">
      <Cover cover={p.cover} fallback={p.fallback} />
      <div className="pp-id">
        <span className={`pp-av${open.length ? ' is-open' : ''}`}><Avatar name={p.name} path={p.avatar} size={116} ring={p.ring} online={p.online} />{open.length > 0 && <em>Open to work</em>}</span>
        <div className="pp-name">
          <h1>{p.name}{p.profile.pronouns && <small className="pp-pron">({p.profile.pronouns})</small>}{p.me && <em className="you">You</em>}</h1>
          {p.roles.length > 0 && <div className="badges">{p.roles.map((b) => <span key={b.label} className={`role${b.dashed ? ' is-dashed' : ''}`} style={{ ['--rc' as string]: b.color }}><i />{b.label}</span>)}</div>}
          {p.showRank && <div className="rank-row"><RankChip total={p.total} big /></div>}
          {p.headline && <p className="pp-headline">{p.headline}</p>}
          <p className="pp-meta">{[p.meta, p.profile.location].filter(Boolean).join(' · ')}{p.seen}</p>
          {open.length > 0 && <p className="pp-open"><Icon name="briefcase" size={15} /><span><b>Open to</b> {open.join(', ')}</span></p>}
        </div>
        {p.actions && <div className="pp-actions">{p.actions}</div>}
      </div>
    </section>
  )
}

/** Facts that come from LPS records (not typed by the member). */
export function VerifiedBox({ total, showRank, attendance, since, roles }: { total: number; showRank: boolean; attendance: MemberPage['attendance']; since: string | null; roles: Badge[] }) {
  const r = rankOf(total)
  return (
    <section className="panel pp-verified">
      <div className="pv-head"><Icon name="verified" size={18} /><span>Verified by USJ LPS</span></div>
      {showRank && <div className="pp-rank"><Medal rank={r.rank.key} size={50} /><div><small>Rank</small><strong>{r.rank.name}</strong><span>{total} sticker{total === 1 ? '' : 's'}{r.next ? ` · ${r.toNext} to ${r.next.name}` : ''}</span></div></div>}
      <dl className="pp-facts">
        {roles.length > 0 && <><dt>Position</dt><dd>{roles.map((b) => b.label).join(' · ')}</dd></>}
        {attendance && <>
          <dt>General Meetings</dt><dd>{attendance.attended} attended</dd>
          <dt>Last General Meeting</dt>
          <dd>{attendance.last ? <><strong>{attendance.last.title}</strong><small>{fmtDate(attendance.last.starts_at)}{attendance.last.headliner ? ' · Headliner' : ''}</small></> : 'None yet'}</dd>
        </>}
        {since && <><dt>Member since</dt><dd>{fmtDate(since, { month: 'long', year: 'numeric' })}</dd></>}
      </dl>
    </section>
  )
}

export interface LinkItem { icon: string; label: string; text: string; href: string }
export function linkList(x: { linkedin?: string | null; email?: string | null; instagram?: string | null; x_handle?: string | null; tiktok?: string | null; github?: string | null; website?: string | null }) {
  const out: LinkItem[] = []
  const li = safeUrl(x.linkedin), web = safeUrl(x.website)
  if (li) out.push({ icon: 'linkedin', label: 'LinkedIn', text: prettyUrl(li), href: li })
  if (x.instagram) out.push({ icon: 'insta', label: 'Instagram', text: `@${x.instagram}`, href: `https://instagram.com/${x.instagram}` })
  if (x.x_handle) out.push({ icon: 'xlogo', label: 'X', text: `@${x.x_handle}`, href: `https://x.com/${x.x_handle}` })
  if (x.tiktok) out.push({ icon: 'tiktok', label: 'TikTok', text: `@${x.tiktok}`, href: `https://www.tiktok.com/@${x.tiktok}` })
  if (x.github) out.push({ icon: 'github', label: 'GitHub', text: x.github, href: `https://github.com/${x.github}` })
  if (web) out.push({ icon: 'globe', label: 'Website', text: prettyUrl(web), href: web })
  if (x.email) out.push({ icon: 'mail', label: 'Email', text: x.email, href: `mailto:${x.email}` })
  return out
}
export function LinksBox({ links, title = 'Contact & links' }: { links: LinkItem[]; title?: string }) {
  if (!links.length) return null
  return (
    <section className="panel pp-links">
      <h2>{title}</h2>
      {links.map((l) => <a key={l.label} href={l.href} target={l.href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer"><Icon name={l.icon} size={18} /><span><small>{l.label}</small>{l.text}</span><Icon name="ext" size={13} /></a>)}
    </section>
  )
}

// ---- Sections ---------------------------------------------------------------
export const DEF: Record<ListKey, { title: string; icon: string; img?: 'logo' | 'image'; add: string }> = {
  featured: { title: 'Featured', icon: 'sparkle', img: 'image', add: 'Add featured link' },
  experience: { title: 'Experience', icon: 'briefcase', img: 'logo', add: 'Add position' },
  education: { title: 'Education', icon: 'school', img: 'logo', add: 'Add education' },
  certifications: { title: 'Licenses & certifications', icon: 'cert', img: 'logo', add: 'Add license or certification' },
  projects: { title: 'Projects', icon: 'folder', img: 'image', add: 'Add project' },
  volunteering: { title: 'Volunteering', icon: 'heart', img: 'logo', add: 'Add volunteer experience' },
  awards: { title: 'Honors & awards', icon: 'trophy', img: 'image', add: 'Add honor or award' },
}
export const ORDER: ListKey[] = ['featured', 'experience', 'education', 'certifications', 'projects', 'volunteering', 'awards']

function Thumb({ path, name, icon, wide, photo }: { path?: string | null; name: string; icon: string; wide?: boolean; photo?: boolean }) {
  const src = useAvatar(path ? `member-media/${path}` : null).data
  return <span className={`thumb${wide ? ' is-wide' : ''}${photo ? ' is-photo' : ''}${src ? ' has-img' : ''}`}>{src ? <img src={src} alt="" loading="lazy" /> : name.trim() ? <b>{initials(name)}</b> : <Icon name={icon} size={20} />}</span>
}
function view(k: ListKey, e: Record<string, string & boolean>) {
  const join = (...xs: (string | undefined)[]) => xs.filter(Boolean).join(' · ')
  switch (k) {
    case 'experience': return { title: e.title, sub: join(e.org, e.type), when: span(e.start, e.end, e.current), extra: e.location, desc: e.description, name: e.org }
    case 'education': return { title: e.school, sub: [e.degree, e.field].filter(Boolean).join(', '), when: [fmtYm(e.start), fmtYm(e.end)].filter(Boolean).join(' – '), extra: e.grade ? `Grade: ${e.grade}` : '', desc: [e.activities ? `Activities and societies: ${e.activities}` : '', e.description].filter(Boolean).join('\n'), name: e.school }
    case 'certifications': return { title: e.name, sub: e.issuer, when: join(e.issued ? `Issued ${fmtYm(e.issued)}` : '', e.expires ? `Expires ${fmtYm(e.expires)}` : ''), extra: e.credential_id ? `Credential ID ${e.credential_id}` : '', desc: '', url: e.url, urlLabel: 'Show credential', name: e.issuer || e.name }
    case 'projects': return { title: e.name, sub: '', when: [fmtYm(e.start), e.current ? 'Present' : fmtYm(e.end)].filter(Boolean).join(' – '), extra: '', desc: e.description, url: e.url, urlLabel: 'Open project', name: e.name }
    case 'volunteering': return { title: e.role, sub: e.org, when: span(e.start, e.end, e.current), extra: e.cause, desc: e.description, name: e.org }
    case 'awards': return { title: e.title, sub: e.issuer ? `Issued by ${e.issuer}` : '', when: fmtYm(e.date), extra: '', desc: e.description, name: '' }
    case 'featured': return { title: e.title, sub: '', when: '', extra: '', desc: e.description, url: e.url, urlLabel: 'Open', name: e.title }
  }
}
function Desc({ text }: { text: string }) {
  const [more, setMore] = useState(false)
  if (!text) return null
  const long = text.length > 280 || text.split('\n').length > 4
  return <p className={`ent-desc${long && !more ? ' is-clamp' : ''}`}>{text}{long && <button className="link ent-more" onClick={() => setMore(!more)}>{more ? 'Show less' : '…see more'}</button>}</p>
}

export interface Owner { edit: (k: ListKey, e: Entry | null) => void; skills: () => void; langs: () => void }
export function Section({ k, profile, owner }: { k: ListKey; profile: Profile; owner?: Owner }) {
  const d = DEF[k]
  const items = useMemo(() => (k === 'featured' ? (profile[k] ?? []) : sorted(profile[k] as Entry[] | undefined)) as Entry[], [k, profile])
  if (!items.length) return null
  return (
    <section className={`panel pp-sec sec-${k}`}>
      <div className="panel-head"><h2>{d.title}</h2>{owner && <button className="icon-btn" onClick={() => owner.edit(k, null)} aria-label={d.add} title={d.add}><Icon name="plus" size={18} /></button>}</div>
      {k === 'featured'
        ? <div className="feat-grid">{items.map((e) => { const x = view(k, e as never); const u = safeUrl(x.url)
            return (
              <article key={e.id} className="feat">
                {u ? <a href={u} target="_blank" rel="noopener noreferrer" className="feat-link"><Thumb path={(e as { image?: string }).image} name={x.title} icon={d.icon} wide /><strong>{x.title}</strong>{x.desc && <p>{x.desc}</p>}<small>{prettyUrl(u).split('/')[0]}</small></a>
                  : <div className="feat-link"><Thumb path={(e as { image?: string }).image} name={x.title} icon={d.icon} wide /><strong>{x.title}</strong>{x.desc && <p>{x.desc}</p>}</div>}
                {owner && <button className="icon-btn ent-edit" onClick={() => owner.edit(k, e)} aria-label="Edit"><Icon name="edit" size={15} /></button>}
              </article>
            ) })}</div>
        : items.map((e) => { const x = view(k, e as never); const u = safeUrl(x.url)
            return (
              <article key={e.id} className="ent">
                {d.img && <Thumb path={(e as { logo?: string; image?: string })[d.img]} name={x.name ?? ''} icon={d.icon} photo={d.img === 'image'} />}
                <div className="ent-main">
                  <strong>{x.title}</strong>
                  {x.sub && <span>{x.sub}</span>}
                  {x.when && <small>{x.when}</small>}
                  {x.extra && <small>{x.extra}</small>}
                  <Desc text={x.desc ?? ''} />
                  {u && <a className="btn btn-ghost btn-sm ent-url" href={u} target="_blank" rel="noopener noreferrer">{x.urlLabel}<Icon name="ext" size={13} /></a>}
                </div>
                {owner && <button className="icon-btn ent-edit" onClick={() => owner.edit(k, e)} aria-label="Edit"><Icon name="edit" size={15} /></button>}
              </article>
            ) })}
    </section>
  )
}
export function SkillsBox({ profile, owner }: { profile: Profile; owner?: Owner }) {
  const s = profile.skills ?? [], l = profile.languages ?? []
  return <>
    {s.length > 0 && (
      <section className="panel pp-sec">
        <div className="panel-head"><h2>Skills</h2>{owner && <button className="icon-btn" onClick={owner.skills} aria-label="Edit skills"><Icon name="edit" size={16} /></button>}</div>
        <div className="skill-tags">{s.map((x) => <span key={x}>{x}</span>)}</div>
      </section>
    )}
    {l.length > 0 && (
      <section className="panel pp-sec">
        <div className="panel-head"><h2>Languages</h2>{owner && <button className="icon-btn" onClick={owner.langs} aria-label="Edit languages"><Icon name="edit" size={16} /></button>}</div>
        {l.map((x) => <div key={x.id} className="lang-row"><strong>{x.name}</strong>{x.level && <small>{x.level} proficiency</small>}</div>)}
      </section>
    )}
  </>
}
export function AllSections({ profile, owner }: { profile: Profile; owner?: Owner }) {
  return <>{ORDER.map((k) => <Section key={k} k={k} profile={profile} owner={owner} />)}<SkillsBox profile={profile} owner={owner} /></>
}

// ---- Editors (owner only) ----------------------------------------------------------
type F = { k: string; label: string; kind?: 'text' | 'area' | 'select' | 'check' | 'date' | 'url'; opts?: readonly string[]; ph?: string; req?: boolean; half?: boolean; hideIf?: string; max?: number }
const FIELDS: Record<ListKey, F[]> = {
  experience: [
    { k: 'title', label: 'Title', req: true, ph: 'e.g. Finance Intern', max: 100 },
    { k: 'org', label: 'Company or organization', req: true, ph: 'e.g. Travelers', half: true, max: 100 },
    { k: 'type', label: 'Employment type', kind: 'select', opts: EMPLOYMENT, half: true },
    { k: 'location', label: 'Location', ph: 'e.g. Hartford, CT · Remote', max: 80 },
    { k: 'current', label: 'I currently work here', kind: 'check' },
    { k: 'start', label: 'Start date', kind: 'date', half: true }, { k: 'end', label: 'End date', kind: 'date', half: true, hideIf: 'current' },
    { k: 'description', label: 'Description', kind: 'area', ph: 'What you did and what you achieved. One point per line.', max: 2000 },
  ],
  education: [
    { k: 'school', label: 'School', req: true, ph: 'e.g. University of Saint Joseph', max: 120 },
    { k: 'degree', label: 'Degree', ph: "e.g. Bachelor of Science", half: true, max: 100 }, { k: 'field', label: 'Field of study', ph: 'e.g. Accounting', half: true, max: 100 },
    { k: 'start', label: 'Start date', kind: 'date', half: true }, { k: 'end', label: 'End date (or expected)', kind: 'date', half: true },
    { k: 'grade', label: 'Grade', ph: 'e.g. GPA 3.8', max: 40 },
    { k: 'activities', label: 'Activities and societies', ph: 'e.g. LPS, NCAA Ice Hockey', max: 300 },
    { k: 'description', label: 'Description', kind: 'area', max: 1500 },
  ],
  certifications: [
    { k: 'name', label: 'Name', req: true, ph: 'e.g. Microsoft Office Specialist: Excel', max: 120 },
    { k: 'issuer', label: 'Issuing organization', ph: 'e.g. Microsoft', max: 100 },
    { k: 'issued', label: 'Issue date', kind: 'date', half: true }, { k: 'expires', label: 'Expiration date', kind: 'date', half: true },
    { k: 'credential_id', label: 'Credential ID', half: true, max: 80 }, { k: 'url', label: 'Credential URL', kind: 'url', half: true, ph: 'https://…' },
  ],
  projects: [
    { k: 'name', label: 'Project name', req: true, max: 120 },
    { k: 'current', label: 'I am currently working on this', kind: 'check' },
    { k: 'start', label: 'Start date', kind: 'date', half: true }, { k: 'end', label: 'End date', kind: 'date', half: true, hideIf: 'current' },
    { k: 'url', label: 'Project link', kind: 'url', ph: 'https://…' },
    { k: 'description', label: 'Description', kind: 'area', max: 2000 },
  ],
  volunteering: [
    { k: 'role', label: 'Role', req: true, ph: 'e.g. Event Volunteer', max: 100 },
    { k: 'org', label: 'Organization', req: true, half: true, max: 100 }, { k: 'cause', label: 'Cause', half: true, ph: 'e.g. Education, Health', max: 60 },
    { k: 'current', label: 'I am currently volunteering here', kind: 'check' },
    { k: 'start', label: 'Start date', kind: 'date', half: true }, { k: 'end', label: 'End date', kind: 'date', half: true, hideIf: 'current' },
    { k: 'description', label: 'Description', kind: 'area', max: 1500 },
  ],
  awards: [
    { k: 'title', label: 'Title', req: true, ph: "e.g. Dean's List", max: 120 },
    { k: 'issuer', label: 'Issuer', half: true, ph: 'e.g. University of Saint Joseph', max: 100 }, { k: 'date', label: 'Date', kind: 'date', half: true },
    { k: 'description', label: 'Description', kind: 'area', max: 1000 },
  ],
  featured: [
    { k: 'title', label: 'Title', req: true, ph: 'e.g. My case-competition deck', max: 100 },
    { k: 'url', label: 'Link', kind: 'url', req: true, ph: 'https://…' },
    { k: 'description', label: 'Short description', kind: 'area', max: 300 },
  ],
}
const YEARS = (() => { const y = new Date().getFullYear() + 8; return Array.from({ length: 50 }, (_, i) => String(y - i)) })()
function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [y, m] = (value || '').split('-')
  const set = (yy: string, mm: string) => onChange(yy ? (mm ? `${yy}-${mm}` : yy) : '')
  return (
    <span className="date-f">
      <select value={m ?? ''} onChange={(e) => set(y ?? String(new Date().getFullYear()), e.target.value)} aria-label="Month"><option value="">Month</option>{MONTHS.map((x, i) => <option key={x} value={String(i + 1).padStart(2, '0')}>{x}</option>)}</select>
      <select value={y ?? ''} onChange={(e) => set(e.target.value, e.target.value ? (m ?? '') : '')} aria-label="Year"><option value="">Year</option>{YEARS.map((x) => <option key={x}>{x}</option>)}</select>
    </span>
  )
}

export function EntryModal({ k, entry, userId, onSave, onClose }: { k: ListKey; entry: Entry | null; userId: string; onSave: (e: Entry | null, old: Entry | null) => Promise<void>; onClose: () => void }) {
  const toast = useToast()
  const d = DEF[k]
  const blank = Object.fromEntries(FIELDS[k].map((f) => [f.k, f.kind === 'check' ? false : ''])) as Record<string, unknown>
  const [e, setE] = useState<Record<string, unknown>>(entry ? { ...blank, ...entry } : { ...blank, id: uid() })
  const [busy, setBusy] = useState<'' | 'img' | 'save' | 'del'>('')
  const up = useRef<string[]>([]); const fileIn = useRef<HTMLInputElement>(null)
  const set = (p: Record<string, unknown>) => setE({ ...e, ...p })
  const imgKey = d.img
  const close = () => { const orig = entry ? (entry as unknown as Record<string, unknown>)[imgKey ?? ''] : null; const drop = up.current.filter((x) => x !== orig); if (drop.length) void supabase.storage.from('member-media').remove(drop); onClose() }
  const upload = async (file?: File) => {
    if (!file || !imgKey) return
    setBusy('img')
    try {
      const logo = imgKey === 'logo'
      const png = logo || file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif'
      const blob = logo ? await logoImage(file) : await shrinkImage(file, 1200, 800, false, png ? 'image/png' : 'image/jpeg')
      const path = `${userId}/${logo ? 'logo' : 'img'}-${Date.now().toString(36)}.${png ? 'png' : 'jpg'}`
      const { error } = await supabase.storage.from('member-media').upload(path, blob, { contentType: png ? 'image/png' : 'image/jpeg', cacheControl: '31536000' })
      if (error) throw error
      up.current.push(path); set({ [imgKey]: path })
    } catch (x) { toast.error(x) } finally { setBusy('') }
  }
  const save = async () => {
    const miss = FIELDS[k].find((f) => f.req && !String(e[f.k] ?? '').trim())
    if (miss) { toast.error(`Add the ${miss.label.toLowerCase()}.`); return }
    for (const f of FIELDS[k]) if (f.kind === 'url' && String(e[f.k] ?? '').trim() && !safeUrl(String(e[f.k]))) { toast.error('That link does not look right.'); return }
    if (e.current) e.end = ''
    setBusy('save')
    try { await onSave(e as unknown as Entry, entry); up.current = []; onClose() } catch (x) { toast.error(x) } finally { setBusy('') }
  }
  const remove = async () => {
    if (!entry || !window.confirm('Delete this item?')) return
    setBusy('del')
    try { await onSave(null, entry); onClose() } catch (x) { toast.error(x) } finally { setBusy('') }
  }
  const imgVal = imgKey ? (e[imgKey] as string | null | undefined) : null
  return (
    <Modal title={`${entry ? 'Edit' : 'Add'} ${d.title.toLowerCase().replace(/s$/, '').replace('licenses & certification', 'license or certification').replace('honors & award', 'honor or award')}`} onClose={close}
      foot={<>{entry && <button className="btn btn-ghost btn-danger" disabled={!!busy} onClick={() => void remove()}><Icon name="trash" size={15} />Delete</button>}<span className="grow" /><button className="btn btn-ghost" onClick={close}>Cancel</button><button className="btn btn-gold" disabled={!!busy} onClick={() => void save()}>{busy === 'save' ? 'Saving…' : 'Save'}</button></>}>
      <div className="mform">
        {imgKey && (
          <div className="mf-img">
            <Thumb path={imgVal} name={k === 'awards' ? '' : String(e.org ?? e.school ?? e.issuer ?? e.name ?? e.title ?? '')} icon={d.icon} wide={imgKey === 'image'} />
            <div>
              <strong>{imgKey === 'logo' ? 'Logo' : k === 'awards' ? 'Photo or logo' : 'Image'}</strong>
              <small>{imgKey === 'logo' ? 'Upload the logo. A plain white or black background is removed automatically.' : k === 'awards' ? 'A photo of the trophy, medal, certificate or team, or the league logo.' : 'Optional cover image for this item.'}</small>
              <span className="row-gap"><button type="button" className="btn btn-ghost btn-sm" disabled={busy === 'img'} onClick={() => fileIn.current?.click()}><Icon name="camera" size={14} />{busy === 'img' ? 'Uploading…' : imgVal ? 'Change' : 'Upload'}</button>{imgVal && <button type="button" className="link" onClick={() => set({ [imgKey]: null })}>Remove</button>}</span>
            </div>
            <input ref={fileIn} type="file" accept="image/*" hidden onChange={(x) => { void upload(x.target.files?.[0]); x.target.value = '' }} />
          </div>
        )}
        {FIELDS[k].map((f) => {
          if (f.hideIf && e[f.hideIf]) return null
          const v = e[f.k]
          if (f.kind === 'check') return <label key={f.k} className="check mf-full"><input type="checkbox" checked={!!v} onChange={(x) => set({ [f.k]: x.target.checked })} /><span>{f.label}</span></label>
          return (
            <label key={f.k} className={`fld${f.half ? '' : ' mf-full'}`}>
              <span>{f.label}{f.req && <em className="req">*</em>}</span>
              {f.kind === 'area' ? <textarea rows={4} maxLength={f.max} value={String(v ?? '')} placeholder={f.ph} onChange={(x) => set({ [f.k]: x.target.value })} />
                : f.kind === 'select' ? <select value={String(v ?? '')} onChange={(x) => set({ [f.k]: x.target.value })}><option value="">Please select</option>{f.opts!.map((o) => <option key={o}>{o}</option>)}</select>
                : f.kind === 'date' ? <DateField value={String(v ?? '')} onChange={(x) => set({ [f.k]: x })} />
                : <input value={String(v ?? '')} maxLength={f.max ?? 300} inputMode={f.kind === 'url' ? 'url' : undefined} placeholder={f.ph} onChange={(x) => set({ [f.k]: x.target.value })} />}
            </label>
          )
        })}
      </div>
    </Modal>
  )
}

export function SkillsModal({ skills, onSave, onClose }: { skills: string[]; onSave: (s: string[]) => Promise<void>; onClose: () => void }) {
  const toast = useToast()
  const [list, setList] = useState(skills); const [t, setT] = useState(''); const [busy, setBusy] = useState(false)
  const add = () => { const v = t.trim().slice(0, 60); if (!v) return; if (!list.some((x) => x.toLowerCase() === v.toLowerCase())) { if (list.length >= 50) { toast.error('Up to 50 skills.'); return } setList([...list, v]) } setT('') }
  return (
    <Modal title="Skills" onClose={onClose} foot={<><span className="grow" /><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-gold" disabled={busy} onClick={async () => { setBusy(true); try { await onSave(list); onClose() } catch (e) { toast.error(e) } finally { setBusy(false) } }}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <p className="muted small">Add the skills you want employers to notice: tools, languages, methods. Press Enter after each one.</p>
      <div className="tag-in">
        {list.map((x) => <span key={x}>{x}<button onClick={() => setList(list.filter((y) => y !== x))} aria-label={`Remove ${x}`}><Icon name="close" size={12} /></button></span>)}
        <input value={t} placeholder={list.length ? 'Add another skill' : 'e.g. Excel, Financial modeling, Public speaking'} onChange={(e) => setT(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } else if (e.key === 'Backspace' && !t && list.length) setList(list.slice(0, -1)) }} onBlur={add} />
      </div>
    </Modal>
  )
}
export function LangsModal({ langs, onSave, onClose }: { langs: Lang[]; onSave: (l: Lang[]) => Promise<void>; onClose: () => void }) {
  const toast = useToast()
  const [list, setList] = useState<Lang[]>(langs.length ? langs : [{ id: uid(), name: '', level: '' }]); const [busy, setBusy] = useState(false)
  const patch = (i: number, p: Partial<Lang>) => setList(list.map((x, j) => (j === i ? { ...x, ...p } : x)))
  return (
    <Modal title="Languages" onClose={onClose} foot={<><span className="grow" /><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-gold" disabled={busy} onClick={async () => { setBusy(true); try { await onSave(list.filter((x) => x.name.trim()).map((x) => ({ ...x, name: x.name.trim().slice(0, 40) }))); onClose() } catch (e) { toast.error(e) } finally { setBusy(false) } }}>{busy ? 'Saving…' : 'Save'}</button></>}>
      {list.map((l, i) => (
        <div key={l.id} className="lang-edit">
          <input value={l.name} placeholder="Language" maxLength={40} onChange={(e) => patch(i, { name: e.target.value })} />
          <select value={l.level} onChange={(e) => patch(i, { level: e.target.value })}><option value="">Proficiency</option>{LANG_LEVELS.map((x) => <option key={x}>{x}</option>)}</select>
          <button className="icon-btn" onClick={() => setList(list.filter((_, j) => j !== i))} aria-label="Remove"><Icon name="trash" size={15} /></button>
        </div>
      ))}
      {list.length < 15 && <button className="link" onClick={() => setList([...list, { id: uid(), name: '', level: '' }])}><Icon name="plus" size={14} />Add language</button>}
    </Modal>
  )
}
