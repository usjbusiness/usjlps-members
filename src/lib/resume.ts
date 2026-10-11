// Résumé Builder: data model, USJ Career-Center layout, Word and PDF export.
import { MAJOR_ROLE, rankOf, type Me } from './api'
import { drawRuns, fileSafe, newPdf, saveBlob, wrapRuns, type Run } from './doc'

export interface Edu { id: string; school: string; location: string; date: string; degree: string; lines: string; bullets: string }
export interface Job { id: string; org: string; location: string; title: string; start: string; end: string; bullets: string }
export interface Project { id: string; name: string; text: string }
export interface Resume {
  name: string; phone: string; email: string; location: string; linkedin: string
  education: Edu[]; experience: Job[]; projects: Project[]; leadership: Job[]
  skills: { technical: string; languages: string; certifications: string; interests: string }
  honors: string
  projectsFirst: boolean
}
export const uid = () => Math.random().toString(36).slice(2, 10)
export const emptyJob = (): Job => ({ id: uid(), org: '', location: '', title: '', start: '', end: '', bullets: '' })
export const emptyEdu = (): Edu => ({ id: uid(), school: '', location: '', date: '', degree: '', lines: '', bullets: '' })
export const emptyProject = (): Project => ({ id: uid(), name: '', text: '' })

const monthYear = (v?: string | null) => (v ? new Date(`${v.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '')

/** The LPS entry for "Leadership & Community Involvement", written from the member's real record. */
export function lpsEntry(me: Me, attended: { title: string; headliner: boolean }[]): Job {
  const r = rankOf(me.total)
  const role = me.board?.position_title ?? (me.major_roles[0] ? `${MAJOR_ROLE[me.major_roles[0].major_role] ?? 'Team Member'}, ${me.major_roles[0].major} Major Team` : 'Member')
  const heads = attended.filter((a) => a.headliner).map((a) => a.title.replace(/^Headliner:\s*/i, '')).slice(0, 2)
  const bullets: string[] = []
  if (attended.length) bullets.push(`Attended ${attended.length} professional development event${attended.length === 1 ? '' : 's'}${heads.length ? `, including ${heads.join(' and ')}` : ''}`)
  if (r.index > 0) bullets.push(`Earned ${r.rank.name} rank (${me.total} engagement stickers) for consistent participation in Society programming`)
  bullets.push('Built professional skills through guest speaker sessions, networking events and business simulations')
  return { id: uid(), org: 'USJ Leadership & Professional Society', location: 'West Hartford, CT', title: role, start: monthYear(me.member?.date_joined) || monthYear(new Date().toISOString()), end: 'Present', bullets: bullets.join('\n') }
}

export function initialResume(me: Me, email: string, attended: { title: string; headliner: boolean }[]): Resume {
  const m = me.member; const year = m?.grad_year ?? me.board?.grad_year
  return {
    name: m?.full_name ?? me.board?.full_name ?? '', phone: '', email, location: 'West Hartford, CT', linkedin: (m?.linkedin_url ?? '').replace(/^https?:\/\/(www\.)?/, ''),
    education: [{ ...emptyEdu(), school: 'University of Saint Joseph', location: 'West Hartford, CT', date: year ? `May ${year}` : '', degree: '' }],
    experience: [], projects: [], leadership: [lpsEntry(me, attended)],
    skills: { technical: '', languages: '', certifications: '', interests: '' }, honors: '', projectsFirst: false,
  }
}

// ---- Layout (shared by the preview, Word and PDF) ---------------------------
export type Block =
  | { t: 'name'; text: string }
  | { t: 'contact'; text: string }
  | { t: 'heading'; text: string }
  | { t: 'row'; left: Run[]; right: string; gap: boolean }
  | { t: 'line'; runs: Run[] }
  | { t: 'bullet'; runs: Run[] }

const lines = (s: string) => s.split('\n').map((x) => x.replace(/^\s*[•\-–*]\s*/, '').trim()).filter(Boolean)
const dates = (a: string, b: string) => [a.trim(), b.trim()].filter(Boolean).join(' – ')
const place = (org: string, loc: string): Run[] => [{ text: org.trim(), b: true }, ...(loc.trim() ? [{ text: `, ${loc.trim()}` }] : [])]

export function blocks(r: Resume): Block[] {
  const out: Block[] = []
  if (r.name.trim()) out.push({ t: 'name', text: r.name.trim() })
  const contact = [r.phone, r.email, r.location, r.linkedin].map((s) => s.trim()).filter(Boolean).join(' | ')
  if (contact) out.push({ t: 'contact', text: contact })
  const jobs = (title: string, list: Job[]) => {
    const real = list.filter((j) => j.org.trim() || j.title.trim() || j.bullets.trim())
    if (!real.length) return
    out.push({ t: 'heading', text: title })
    real.forEach((j, i) => {
      out.push({ t: 'row', left: place(j.org, j.location), right: dates(j.start, j.end), gap: i > 0 })
      if (j.title.trim()) out.push({ t: 'line', runs: [{ text: j.title.trim(), i: true }] })
      lines(j.bullets).forEach((b) => out.push({ t: 'bullet', runs: [{ text: b }] }))
    })
  }
  const edu = r.education.filter((e) => e.school.trim() || e.degree.trim())
  if (edu.length) {
    out.push({ t: 'heading', text: 'Education' })
    edu.forEach((e, i) => {
      out.push({ t: 'row', left: place(e.school, e.location), right: e.date.trim(), gap: i > 0 })
      if (e.degree.trim()) out.push({ t: 'line', runs: [{ text: e.degree.trim(), i: true }] })
      lines(e.lines).forEach((l) => out.push({ t: 'line', runs: [{ text: l, i: true }] }))
      lines(e.bullets).forEach((b) => out.push({ t: 'bullet', runs: [{ text: b }] }))
    })
  }
  const projects = () => {
    const real = r.projects.filter((p) => p.name.trim() || p.text.trim())
    if (!real.length) return
    out.push({ t: 'heading', text: 'Projects' })
    real.forEach((p) => out.push({ t: 'bullet', runs: [...(p.name.trim() ? [{ text: `${p.name.trim().toUpperCase()}: `, b: true }] : []), { text: p.text.trim() }] }))
  }
  if (r.projectsFirst) projects()
  jobs('Experience', r.experience)
  if (!r.projectsFirst) projects()
  jobs('Leadership & Community Involvement', r.leadership)
  const sk = ([['Technical / Computer Skills', r.skills.technical], ['Languages', r.skills.languages], ['Certifications', r.skills.certifications], ['Interests', r.skills.interests]] as const).filter(([, v]) => v.trim())
  if (sk.length) {
    out.push({ t: 'heading', text: 'Skills' })
    sk.forEach(([k, v]) => out.push({ t: 'line', runs: [{ text: `${k}: `, b: true }, { text: v.trim() }] }))
  }
  const honors = lines(r.honors)
  if (honors.length) {
    out.push({ t: 'heading', text: 'Honors and Awards' })
    honors.forEach((h) => out.push({ t: 'bullet', runs: [{ text: h, b: true }] }))
  }
  return out
}

// ---- Word (.docx) ------------------------------------------------------------
export async function downloadDocx(r: Resume) {
  const d = await import('docx')
  const run = (x: Run, size?: number) => new d.TextRun({ text: x.text, bold: x.b, italics: x.i, size })
  const children = blocks(r).map((b) => {
    switch (b.t) {
      case 'name': return new d.Paragraph({ alignment: d.AlignmentType.CENTER, children: [new d.TextRun({ text: b.text, bold: true, size: 30 })] })
      case 'contact': return new d.Paragraph({ alignment: d.AlignmentType.CENTER, spacing: { after: 120 }, children: [new d.TextRun({ text: b.text })] })
      case 'heading': return new d.Paragraph({ spacing: { before: 200, after: 40 }, border: { bottom: { style: d.BorderStyle.SINGLE, size: 6, color: '000000', space: 1 } }, children: [new d.TextRun({ text: b.text.toUpperCase(), bold: true })] })
      case 'row': return new d.Paragraph({ spacing: { before: b.gap ? 120 : 0 }, tabStops: [{ type: d.TabStopType.RIGHT, position: 10800 }], children: [...b.left.map((x) => run(x)), ...(b.right ? [new d.TextRun({ children: [new d.Tab(), b.right] })] : [])] })
      case 'line': return new d.Paragraph({ children: b.runs.map((x) => run(x)) })
      case 'bullet': return new d.Paragraph({ numbering: { reference: 'bullets', level: 0 }, children: b.runs.map((x) => run(x)) })
    }
  })
  const doc = new d.Document({
    creator: 'USJ LPS Member Portal', title: `${r.name} Resume`,
    styles: { default: { document: { run: { font: 'Calibri', size: 22 }, paragraph: { spacing: { after: 0, line: 240 } } } } },
    numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: d.LevelFormat.BULLET, text: '•', alignment: d.AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }],
  })
  saveBlob(await d.Packer.toBlob(doc), `${fileSafe(r.name || 'My')} Resume.docx`)
}

// ---- PDF -----------------------------------------------------------------------
export async function downloadPdf(r: Resume) {
  const { pdf, font } = await newPdf()
  const M = 36, W = 612, H = 792, R = W - M, size = 11, lh = 13.4
  let y = M
  const need = (h: number) => { if (y + h > H - M) { pdf.addPage(); y = M } }
  for (const b of blocks(r)) {
    if (b.t === 'name') { pdf.setFont(font, 'bold'); pdf.setFontSize(15); y += 15; pdf.text(b.text, W / 2, y, { align: 'center' }); y += 4 }
    else if (b.t === 'contact') { pdf.setFont(font, 'normal'); pdf.setFontSize(size); for (const l of pdf.splitTextToSize(b.text, R - M) as string[]) { y += lh; pdf.text(l, W / 2, y, { align: 'center' }) } y += 6 }
    else if (b.t === 'heading') { need(lh * 3 + 10); y += 10 + lh; pdf.setFont(font, 'bold'); pdf.setFontSize(size); pdf.text(b.text.toUpperCase(), M, y); pdf.setLineWidth(0.75); pdf.line(M, y + 2.5, R, y + 2.5); y += 3 }
    else if (b.t === 'row') {
      pdf.setFont(font, 'normal'); pdf.setFontSize(size)
      const rw = b.right ? pdf.getTextWidth(b.right) + 12 : 0
      const ls = wrapRuns(pdf, font, size, b.left, R - M - rw)
      need(ls.length * lh + (b.gap ? 6 : 0) + lh); if (b.gap) y += 6
      ls.forEach((l, i) => { y += lh; drawRuns(pdf, font, size, l, M, y); if (i === 0 && b.right) { pdf.setFont(font, 'normal'); pdf.text(b.right, R, y, { align: 'right' }) } })
    } else {
      const indent = b.t === 'bullet' ? 36 : 0
      const ls = wrapRuns(pdf, font, size, b.runs, R - M - indent)
      ls.forEach((l, i) => {
        need(lh); y += lh
        if (b.t === 'bullet' && i === 0) { pdf.setFont(font, 'normal'); pdf.text('•', M + 18, y) }
        drawRuns(pdf, font, size, l, M + indent, y)
      })
    }
  }
  pdf.setProperties({ title: `${r.name} Resume`, creator: 'USJ LPS Member Portal' })
  saveBlob(pdf.output('blob'), `${fileSafe(r.name || 'My')} Resume.pdf`)
}
