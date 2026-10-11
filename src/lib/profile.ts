// LinkedIn-style profile sections stored in member_pages.profile (jsonb).
import type { Resume } from './resume'

export interface Exp { id: string; title: string; org: string; type: string; location: string; start: string; end: string; current: boolean; description: string; logo?: string | null }
export interface EduP { id: string; school: string; degree: string; field: string; start: string; end: string; grade: string; activities: string; description: string; logo?: string | null }
export interface Cert { id: string; name: string; issuer: string; issued: string; expires: string; credential_id: string; url: string; logo?: string | null }
export interface Proj { id: string; name: string; start: string; end: string; current: boolean; url: string; description: string; image?: string | null }
export interface Vol { id: string; role: string; org: string; cause: string; start: string; end: string; current: boolean; description: string; logo?: string | null }
export interface Award { id: string; title: string; issuer: string; date: string; description: string; image?: string | null }
export interface Lang { id: string; name: string; level: string }
export interface Feat { id: string; title: string; url: string; description: string; image?: string | null }
export interface Profile {
  pronouns?: string; location?: string; open_to?: string[]
  experience?: Exp[]; education?: EduP[]; certifications?: Cert[]; projects?: Proj[]; volunteering?: Vol[]
  awards?: Award[]; skills?: string[]; languages?: Lang[]; featured?: Feat[]
}
export type ListKey = 'experience' | 'education' | 'certifications' | 'projects' | 'volunteering' | 'awards' | 'featured'
export type Entry = Exp | EduP | Cert | Proj | Vol | Award | Feat

export const uid = () => Math.random().toString(36).slice(2, 10)
export const EMPLOYMENT = ['Internship', 'Part-time', 'Full-time', 'Student organization', 'Self-employed', 'Freelance', 'Contract', 'Seasonal', 'Volunteer']
export const LANG_LEVELS = ['Native or bilingual', 'Full professional', 'Professional working', 'Limited working', 'Elementary']
export const OPEN_TO = [
  { key: 'internships', label: 'Internships' }, { key: 'full_time', label: 'Full-time roles' }, { key: 'part_time', label: 'Part-time jobs' },
  { key: 'networking', label: 'Networking' }, { key: 'mentoring', label: 'Mentoring' },
] as const
export const PRONOUNS = ['He/Him', 'She/Her', 'They/Them']

// ---- Dates: stored as "YYYY" or "YYYY-MM" ------------------------------------
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const MONTHS = MON
export function fmtYm(v?: string | null) {
  if (!v) return ''
  const [y, m] = v.split('-')
  return m ? `${MON[Number(m) - 1] ?? ''} ${y}` : y
}
function toMonths(v: string) { const [y, m] = v.split('-').map(Number); return y * 12 + ((m || 1) - 1) }
/** "Jun 2025 – Present · 1 yr 5 mos" */
export function span(start: string, end: string, current: boolean) {
  const a = fmtYm(start), b = current ? 'Present' : fmtYm(end)
  const range = a && b ? `${a} – ${b}` : a || b
  if (!start) return range
  const now = new Date()
  const endM = current || !end ? (current ? now.getFullYear() * 12 + now.getMonth() : null) : toMonths(end)
  if (endM === null) return range
  const n = endM - toMonths(start) + 1
  if (n <= 0 || !start.includes('-')) return range
  const y = Math.floor(n / 12), mo = n % 12
  const d = [y ? `${y} yr${y > 1 ? 's' : ''}` : '', mo ? `${mo} mo${mo > 1 ? 's' : ''}` : ''].filter(Boolean).join(' ')
  return d ? `${range} · ${d}` : range
}
const sortKey = (e: { start?: string; end?: string; current?: boolean; issued?: string; date?: string }) =>
  (e.current ? '9999' : (e.end || e.issued || e.date || e.start || '0000')) + (e.start ?? '')
export const sorted = <T extends object>(xs: T[] | undefined) => [...(xs ?? [])].sort((a, b) => sortKey(b as never).localeCompare(sortKey(a as never)))

/** Only http(s) links are ever rendered. */
export function safeUrl(u?: string | null) {
  const s = (u ?? '').trim()
  if (!s) return null
  const v = /^https?:\/\//i.test(s) ? s : `https://${s}`
  try { const x = new URL(v); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null } catch { return null }
}
export const prettyUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

export const imagesOf = (p: Profile) => {
  const out: string[] = []
  for (const k of ['experience', 'education', 'certifications', 'projects', 'volunteering', 'awards', 'featured'] as const)
    for (const e of (p[k] ?? []) as { logo?: string | null; image?: string | null }[]) { if (e.logo) out.push(e.logo); if (e.image) out.push(e.image) }
  return out
}
export const isEmptyProfile = (p: Profile) => !['experience', 'education', 'certifications', 'projects', 'volunteering', 'awards', 'featured', 'skills', 'languages'].some((k) => ((p as Record<string, unknown[]>)[k] ?? []).length)

// ---- Import from the Résumé Builder --------------------------------------------
function parseDate(s: string): { v: string; present: boolean } {
  const t = s.trim()
  if (!t) return { v: '', present: false }
  if (/present|current|now/i.test(t)) return { v: '', present: true }
  const m = t.match(/([A-Za-z]{3,})\.?\s+(\d{4})/)
  if (m) { const i = MON.findIndex((x) => m[1].toLowerCase().startsWith(x.toLowerCase())); if (i >= 0) return { v: `${m[2]}-${String(i + 1).padStart(2, '0')}`, present: false } }
  const y = t.match(/(\d{4})/)
  return { v: y ? y[1] : '', present: false }
}
const lines = (s: string) => s.split('\n').map((x) => x.replace(/^[•\-*\s]+/, '').trim()).filter(Boolean)
const bullets = (s: string) => lines(s).map((x) => `• ${x}`).join('\n')
const splitList = (s: string) => s.split(/[,;]+/).map((x) => x.trim()).filter(Boolean)

export function fromResume(r: Partial<Resume>): Profile {
  const job = (j: Resume['experience'][number], type: string): Exp => {
    const a = parseDate(j.start ?? ''), b = parseDate(j.end ?? '')
    return { id: uid(), title: j.title ?? '', org: j.org ?? '', type, location: j.location ?? '', start: a.v, end: b.v, current: b.present, description: bullets(j.bullets ?? ''), logo: null }
  }
  const langs = splitList(r.skills?.languages ?? '').map((x): Lang => {
    const m = x.match(/^(.*?)\s*\((.*)\)\s*$/); const name = (m ? m[1] : x).trim(); const lv = (m?.[2] ?? '').toLowerCase()
    return { id: uid(), name, level: /native|bilingual/.test(lv) ? LANG_LEVELS[0] : /fluent|advanced/.test(lv) ? LANG_LEVELS[1] : /basic|elementary|beginner/.test(lv) ? LANG_LEVELS[4] : lv ? LANG_LEVELS[2] : '' }
  })
  return {
    experience: [...(r.experience ?? []).map((j) => job(j, '')), ...(r.leadership ?? []).map((j) => job(j, 'Student organization'))].filter((x) => x.title || x.org),
    education: (r.education ?? []).filter((e) => e.school).map((e): EduP => {
      const d = parseDate(e.date ?? '')
      return { id: uid(), school: e.school, degree: e.degree ?? '', field: '', start: '', end: d.v, grade: (e.bullets ?? '').match(/GPA\s*[\d.]+/i)?.[0] ?? '', activities: lines(e.lines ?? '').join(', '), description: '', logo: null }
    }),
    projects: (r.projects ?? []).filter((p) => p.name || p.text).map((p): Proj => ({ id: uid(), name: p.name, start: '', end: '', current: false, url: '', description: p.text ?? '', image: null })),
    certifications: splitList(r.skills?.certifications ?? '').map((n): Cert => ({ id: uid(), name: n, issuer: '', issued: '', expires: '', credential_id: '', url: '', logo: null })),
    awards: lines(r.honors ?? '').map((h): Award => { const y = h.match(/\((\d{4})\)/); return { id: uid(), title: h.replace(/\s*\(\d{4}\)\s*$/, ''), issuer: '', date: y ? y[1] : '', description: '' } }),
    skills: [...splitList(r.skills?.technical ?? '')].slice(0, 50),
    languages: langs,
  }
}
/** Adds imported items that are not on the page yet. Returns the merged profile and how many were added. */
export function mergeImport(cur: Profile, add: Profile): { next: Profile; added: number } {
  const next: Profile = { ...cur }; let added = 0
  const key = (e: Record<string, unknown>) => `${e.title ?? e.name ?? e.school ?? ''}|${e.org ?? e.issuer ?? e.degree ?? ''}`.toLowerCase()
  for (const k of ['experience', 'education', 'projects', 'certifications', 'awards', 'languages'] as const) {
    const have = new Set(((cur[k] ?? []) as unknown as Record<string, unknown>[]).map(key))
    const fresh = ((add[k] ?? []) as unknown as Record<string, unknown>[]).filter((e) => !have.has(key(e)))
    if (fresh.length) { (next as Record<string, unknown[]>)[k] = [...((cur[k] ?? []) as unknown[]), ...fresh]; added += fresh.length }
  }
  const sk = new Set((cur.skills ?? []).map((s) => s.toLowerCase()))
  const newSk = (add.skills ?? []).filter((s) => !sk.has(s.toLowerCase()))
  if (newSk.length) { next.skills = [...(cur.skills ?? []), ...newSk].slice(0, 50); added += newSk.length }
  return { next, added }
}
