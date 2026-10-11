// My Record: attendance, stickers and merch history, with a PDF statement.
import { APPAREL_STATUS, rankOf, type History } from './api'
import { fileSafe, logoPng, newPdf, saveBlob } from './doc'

export interface Row { key: string; date: string; title: string; kind: 'meeting' | 'headliner' | 'award'; result: string; ok: boolean; stickers: number; total: number; rank: string; by?: string | null }
export interface MerchRow { key: string; date: string; item: string; detail: string; status: string; updated: string; totalThen: number; rankThen: string }

const day = (v: string) => v.slice(0, 10)
export const ITEM_NAME: Record<string, string> = { pin: 'LPS Pin', polo: 'LPS Polo', cap: 'LPS Cap' }
const RESULT: Record<string, string> = { present: 'Present', absent: 'Absent', excused: 'Excused' }

export function buildRecord(h: History) {
  const ev: Omit<Row, 'total' | 'rank'>[] = [
    ...h.meetings.map((m) => ({ key: `m-${m.id}`, date: m.starts_at, title: m.title, kind: (m.headliner ? 'headliner' : 'meeting') as Row['kind'],
      result: m.status ? RESULT[m.status] ?? m.status : 'Not marked', ok: m.status === 'present', stickers: m.status === 'present' ? (m.headliner ? 2 : 1) : 0 })),
    ...h.awards.map((a, i) => ({ key: `a-${i}`, date: `${a.earned_on}T12:00:00`, title: a.event ? `${a.title} (${a.event})` : a.title, kind: 'award' as const,
      result: 'Awarded', ok: true, stickers: a.value, by: a.awarded_by })),
  ].sort((a, b) => a.date.localeCompare(b.date))
  let total = 0
  const rows: Row[] = ev.map((e) => { total += e.stickers; return { ...e, total, rank: rankOf(total).rank.name } })
  const totalOn = (d: string) => rows.filter((r) => day(r.date) <= day(d)).reduce((s, r) => s + r.stickers, 0)
  const merch: MerchRow[] = h.requests.map((q, i) => {
    const t = totalOn(q.created_at)
    return { key: `r-${i}`, date: q.created_at, item: ITEM_NAME[q.item] ?? q.item, detail: [q.size, q.color === 'ivy' ? 'Ivy Green' : q.color ? q.color[0].toUpperCase() + q.color.slice(1) : null].filter(Boolean).join(' · '),
      status: APPAREL_STATUS[q.status] ?? q.status, updated: q.updated_at, totalThen: t, rankThen: rankOf(t).rank.name }
  })
  const meetings = h.meetings.length, present = h.meetings.filter((m) => m.status === 'present').length
  return { rows, merch, total, rank: rankOf(total).rank.name, meetings, present }
}

const fmt = (v: string, o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) => new Date(v).toLocaleDateString('en-US', o)

export async function downloadRecordPdf(h: History, memberNo: string) {
  const rec = buildRecord(h)
  const [{ pdf, font }, logo] = await Promise.all([newPdf(), logoPng()])
  const W = 612, H = 792, M = 42, R = W - M
  const ivy: [number, number, number] = [18, 63, 49], gold: [number, number, number] = [160, 125, 50], ink: [number, number, number] = [25, 25, 25], mute: [number, number, number] = [110, 110, 110]
  let y = 0
  const header = () => {
    pdf.setFillColor(...ivy); pdf.rect(0, 0, W, 78, 'F')
    pdf.setFillColor(...gold); pdf.rect(0, 78, W, 2.5, 'F')
    if (logo) pdf.addImage(logo.data, 'PNG', M, 16, (logo.w / logo.h) * 46, 46)
    pdf.setTextColor(243, 237, 226); pdf.setFont(font, 'bold'); pdf.setFontSize(15)
    pdf.text('USJ Leadership & Professional Society', M + 40, 38)
    pdf.setFont(font, 'normal'); pdf.setFontSize(10); pdf.setTextColor(233, 212, 154)
    pdf.text('MEMBER RECORD  ·  ATTENDANCE, STICKERS AND MERCH', M + 40, 54)
    y = 108
  }
  const footer = (p: number, n: number) => {
    pdf.setDrawColor(220, 220, 220); pdf.setLineWidth(0.5); pdf.line(M, H - 40, R, H - 40)
    pdf.setFont(font, 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...mute)
    pdf.text(`Generated ${new Date(h.generated_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} from members.usjlps.org · Member No. LPS·${memberNo}`, M, H - 26)
    pdf.text(`Page ${p} of ${n}`, R, H - 26, { align: 'right' })
  }
  header()
  // Member summary
  const m = h.member
  pdf.setTextColor(...ink); pdf.setFont(font, 'bold'); pdf.setFontSize(20); pdf.text(m?.full_name ?? '', M, y)
  pdf.setFont(font, 'normal'); pdf.setFontSize(10.5); pdf.setTextColor(...mute)
  pdf.text([m?.email, m?.major, m?.grad_year ? `Class of ${m.grad_year}` : null, m?.date_joined ? `Member since ${fmt(`${m.date_joined}T12:00:00`)}` : null].filter(Boolean).join('  ·  '), M, y + 17)
  y += 36
  const boxes: [string, string][] = [['Current rank', rec.rank], ['Total stickers', String(rec.total)], ['General Meetings attended', `${rec.present} of ${rec.meetings}`], ['Merch requests', String(rec.merch.length)]]
  const bw = (R - M - 3 * 10) / 4
  boxes.forEach(([k, v], i) => {
    const x = M + i * (bw + 10)
    pdf.setDrawColor(...gold); pdf.setLineWidth(0.8); pdf.roundedRect(x, y, bw, 46, 5, 5, 'S')
    pdf.setFont(font, 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...mute); pdf.text(k.toUpperCase(), x + 10, y + 16)
    pdf.setFont(font, 'bold'); pdf.setFontSize(15); pdf.setTextColor(...ink); pdf.text(v, x + 10, y + 36)
  })
  y += 70
  const table = (title: string, cols: { h: string; w: number; align?: 'right' | 'center' }[], data: string[][], marks?: boolean[]) => {
    const rowH = 18
    const head = () => {
      pdf.setFillColor(243, 240, 232); pdf.rect(M, y, R - M, rowH, 'F')
      pdf.setFont(font, 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(...ivy)
      let x = M + 6; cols.forEach((c) => { pdf.text(c.h.toUpperCase(), c.align === 'right' ? x + c.w - 12 : x, y + 12, { align: c.align === 'right' ? 'right' : 'left' }); x += c.w }); y += rowH
    }
    if (y + 60 > H - 56) { pdf.addPage(); header() }
    pdf.setFont(font, 'bold'); pdf.setFontSize(12.5); pdf.setTextColor(...ink); pdf.text(title, M, y); y += 10
    head()
    if (!data.length) { pdf.setFont(font, 'italic'); pdf.setFontSize(10); pdf.setTextColor(...mute); pdf.text('Nothing yet.', M + 6, y + 13); y += rowH + 14; return }
    data.forEach((row, ri) => {
      pdf.setFont(font, 'normal'); pdf.setFontSize(9.5)
      const cells = row.map((v, ci) => pdf.splitTextToSize(v, cols[ci].w - 10) as string[])
      const h = Math.max(...cells.map((c) => c.length)) * 11.5 + 7
      if (y + h > H - 56) { pdf.addPage(); header(); head() }
      if (ri % 2) { pdf.setFillColor(250, 249, 246); pdf.rect(M, y, R - M, h, 'F') }
      let x = M + 6
      cells.forEach((c, ci) => {
        const dim = marks && !marks[ri] && ci >= 2
        pdf.setTextColor(...(dim ? mute : ink)); pdf.setFont(font, ci === 1 ? 'bold' : 'normal')
        c.forEach((line, li) => pdf.text(line, cols[ci].align === 'right' ? x + cols[ci].w - 12 : x, y + 12 + li * 11.5, { align: cols[ci].align === 'right' ? 'right' : 'left' }))
        x += cols[ci].w
      })
      pdf.setDrawColor(232, 228, 218); pdf.setLineWidth(0.4); pdf.line(M, y + h, R, y + h)
      y += h
    })
    y += 24
  }
  const kind = { meeting: 'General Meeting', headliner: 'Headliner (×2)', award: 'Sticker award' }
  table('Attendance and stickers', [{ h: 'Date', w: 70 }, { h: 'Activity', w: 170 }, { h: 'Type', w: 82 }, { h: 'Result', w: 62 }, { h: 'Stickers', w: 50, align: 'right' }, { h: 'Total', w: 40, align: 'right' }, { h: 'Rank', w: 54 }],
    rec.rows.map((r) => [fmt(r.date), r.title, kind[r.kind], r.result, r.stickers ? `+${r.stickers}` : '0', String(r.total), r.rank]), rec.rows.map((r) => r.ok))
  table('Merch requests', [{ h: 'Requested', w: 78 }, { h: 'Item', w: 92 }, { h: 'Size / color', w: 86 }, { h: 'Stickers then', w: 76, align: 'right' }, { h: 'Rank then', w: 70 }, { h: 'Status', w: 126 }],
    rec.merch.map((q) => [fmt(q.date), q.item, q.detail || '—', String(q.totalThen), q.rankThen, `${q.status} (${fmt(q.updated, { month: 'short', day: 'numeric' })})`]))
  if (y + 50 > H - 56) { pdf.addPage(); header() }
  pdf.setFont(font, 'italic'); pdf.setFontSize(9); pdf.setTextColor(...mute)
  pdf.text(pdf.splitTextToSize('Attendance is recorded by the LPS Secretary at each General Meeting; Headliner meetings count as 2 stickers. Sticker awards are added by the Executive Board. Ranks: Bronze 3 · Silver 6 · Gold 10 · Ivy 15 stickers. "Rank then" shows the rank on the day of each request. Questions about this record? Contact the e-board at usjlps.org.', R - M) as string[], M, y)
  const n = pdf.getNumberOfPages()
  for (let p = 1; p <= n; p++) { pdf.setPage(p); footer(p, n) }
  pdf.setProperties({ title: `LPS Member Record — ${m?.full_name ?? ''}`, creator: 'USJ LPS Member Portal' })
  saveBlob(pdf.output('blob'), `LPS Record - ${fileSafe(m?.full_name ?? 'Member')}.pdf`)
}
