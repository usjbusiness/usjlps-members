// The LPS Certificate (landscape PDF) and helpers for LinkedIn / verification.
import { RANKS, type CertInfo } from './api'
import { fileSafe, logoPng, newPdf, saveBlob } from './doc'
import { matrix } from './qr'
import { supabase } from './supabase'

export const CERT_TITLE = 'Certificate of Achievement'
export const ORG = 'USJ Leadership & Professional Society'
export const verifyUrl = (no: string) => `https://members.usjlps.org/verify/${no}`
export const rankName = (k?: string | null) => RANKS.find((r) => r.key === k)?.name ?? 'Silver'
const RANK_RGB: Record<string, [number, number, number]> = { silver: [150, 158, 168], gold: [190, 150, 60], ivy: [24, 84, 64] }

/** LinkedIn "Add licence or certification" with everything pre-filled. */
export function linkedInAddUrl(c: CertInfo) {
  const d = new Date(c.issued_at ?? Date.now())
  const q = new URLSearchParams({ startTask: 'CERTIFICATION_NAME', name: `${CERT_TITLE} · ${rankName(c.rank_key)} Rank`, organizationName: ORG,
    issueYear: String(d.getFullYear()), issueMonth: String(d.getMonth() + 1), certUrl: verifyUrl(c.cert_no ?? ''), certId: c.cert_no ?? '' })
  return `https://www.linkedin.com/profile/add?${q.toString()}`
}

async function signature(path: string | null) {
  if (!path) return null
  try {
    const { data, error } = await supabase.storage.from('signatures').createSignedUrl(path, 300)
    if (error || !data) return null
    const blob = await (await fetch(data.signedUrl)).blob()
    const url = URL.createObjectURL(blob)
    const img = new Image(); img.src = url; await img.decode()
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
    c.getContext('2d')!.drawImage(img, 0, 0); URL.revokeObjectURL(url)
    return { data: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight }
  } catch { return null }
}

export async function downloadCertificatePdf(c: CertInfo, memberSince: string | null) {
  const [{ pdf: p0, font }, logo, sigP, sigA] = await Promise.all([newPdf(), logoPng('/img/mono-gold.webp', 360), signature(c.president_sig), signature(c.advisor_sig)])
  // newPdf() is portrait; start a landscape page and drop the first one.
  const pdf = p0
  pdf.addPage('letter', 'landscape'); pdf.deletePage(1)
  const W = 792, H = 612, cx = W / 2
  const ivory: [number, number, number] = [251, 248, 241], gold: [number, number, number] = [176, 140, 58], ivy: [number, number, number] = [18, 63, 49], ink: [number, number, number] = [28, 28, 28], mute: [number, number, number] = [112, 108, 100]
  pdf.setFillColor(...ivory); pdf.rect(0, 0, W, H, 'F')
  // Frame
  pdf.setDrawColor(...ivy); pdf.setLineWidth(9); pdf.rect(14, 14, W - 28, H - 28, 'S')
  pdf.setDrawColor(...gold); pdf.setLineWidth(1.6); pdf.rect(26, 26, W - 52, H - 52, 'S')
  pdf.setLineWidth(0.5); pdf.rect(32, 32, W - 64, H - 64, 'S')
  for (const [x, y] of [[32, 32], [W - 32, 32], [32, H - 32], [W - 32, H - 32]]) { pdf.setFillColor(...gold); pdf.lines([[6, 6], [-6, 6], [-6, -6], [6, -6]], x, y - 6, [1, 1], 'F', true) }
  // Crest and society line
  if (logo) { const h = 74, w = (logo.w / logo.h) * h; pdf.addImage(logo.data, 'PNG', cx - w / 2, 50, w, h) }
  pdf.setFont(font, 'bold'); pdf.setFontSize(10.5); pdf.setTextColor(...gold)
  pdf.text(ORG.toUpperCase(), cx, 146, { align: 'center', charSpace: 2.6 })
  pdf.setFont(font, 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...mute)
  pdf.text('UNIVERSITY OF SAINT JOSEPH  ·  WEST HARTFORD, CONNECTICUT', cx, 160, { align: 'center', charSpace: 1.6 })
  // Title
  pdf.setFont('times', 'normal'); pdf.setFontSize(40); pdf.setTextColor(...ink)
  pdf.text(CERT_TITLE, cx, 206, { align: 'center' })
  pdf.setFont(font, 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(...mute)
  pdf.text('THIS CERTIFIES THAT', cx, 236, { align: 'center', charSpace: 2.4 })
  // Name
  pdf.setFont('times', 'bolditalic'); pdf.setTextColor(...ivy)
  let size = 44; pdf.setFontSize(size); while (pdf.getTextWidth(c.name) > 560 && size > 26) { size -= 2; pdf.setFontSize(size) }
  pdf.text(c.name, cx, 284, { align: 'center' })
  pdf.setDrawColor(...gold); pdf.setLineWidth(0.8); pdf.line(cx - 230, 298, cx + 230, 298)
  // Body
  const rank = rankName(c.rank_key)
  pdf.setFont(font, 'normal'); pdf.setFontSize(12.5); pdf.setTextColor(...ink)
  const body = `has earned the ${rank} rank of the ${ORG} through active participation in its professional development program of guest speakers, workshops and networking events, and has completed a professional résumé and a professional profile.`
  const lines = pdf.splitTextToSize(body, 540) as string[]
  lines.forEach((l, i) => pdf.text(l, cx, 324 + i * 17, { align: 'center' }))
  const since = memberSince ? new Date(`${memberSince.slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null
  const stats = [c.total != null ? `${c.total} engagement stickers` : null, c.attended != null ? `${c.attended} General Meeting${c.attended === 1 ? '' : 's'} attended` : null, since ? `Member since ${since}` : null].filter(Boolean).join('   ·   ')
  pdf.setFontSize(9.5); pdf.setTextColor(...mute); pdf.text(stats, cx, 336 + lines.length * 17 + 6, { align: 'center' })
  // Signatures
  const sig = (x: number, img: Awaited<ReturnType<typeof signature>>, name: string | null, title: string, sub: string) => {
    const ly = 500
    if (img) { const h = 42, w = Math.min(170, (img.w / img.h) * h); pdf.addImage(img.data, 'PNG', x - w / 2, ly - h - 4, w, (w / ((img.w / img.h))) ) }
    pdf.setDrawColor(...ink); pdf.setLineWidth(0.6); pdf.line(x - 105, ly, x + 105, ly)
    pdf.setFont(font, 'bold'); pdf.setFontSize(11); pdf.setTextColor(...ink); pdf.text(name || ' ', x, ly + 15, { align: 'center' })
    pdf.setFont(font, 'normal'); pdf.setFontSize(9); pdf.setTextColor(...mute); pdf.text(title, x, ly + 28, { align: 'center' }); pdf.text(sub, x, ly + 40, { align: 'center' })
  }
  sig(205, sigP, c.president_name, 'President', ORG)
  sig(W - 205, sigA, c.advisor_name, c.advisor_title || 'Advisor', 'University of Saint Joseph')
  // Rank seal
  const rc = RANK_RGB[c.rank_key ?? 'silver'] ?? RANK_RGB.silver
  pdf.setFillColor(...rc); pdf.circle(cx, 478, 40, 'F')
  pdf.setDrawColor(...ivory); pdf.setLineWidth(1.2); pdf.circle(cx, 478, 34, 'S')
  pdf.setLineWidth(0.4); pdf.circle(cx, 478, 31, 'S')
  pdf.setFont(font, 'bold'); pdf.setTextColor(255, 255, 255); pdf.setFontSize(12.5); pdf.text(rank.toUpperCase(), cx, 481, { align: 'center', charSpace: 1.4 })
  pdf.setFont(font, 'normal'); pdf.setFontSize(6.5); pdf.text('RANK', cx, 492, { align: 'center', charSpace: 1.6 }); pdf.text('LPS', cx, 468, { align: 'center', charSpace: 1.6 })
  // Footer: date, Credential ID and QR
  const issued = new Date(c.issued_at ?? Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  pdf.setFont(font, 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...mute)
  pdf.text(`Issued ${issued}   ·   Credential ID ${c.cert_no ?? ''}   ·   Verify at ${verifyUrl(c.cert_no ?? '').replace('https://', '')}`, cx, 566, { align: 'center' })
  if (c.cert_no) {
    const { n, dark } = matrix(verifyUrl(c.cert_no)); const s = 46, m = s / n, x0 = W - 44 - s, y0 = H - 44 - s
    pdf.setFillColor(255, 255, 255); pdf.rect(x0 - 3, y0 - 3, s + 6, s + 6, 'F'); pdf.setFillColor(...ink)
    for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (dark(r, k)) pdf.rect(x0 + k * m, y0 + r * m, m + 0.05, m + 0.05, 'F')
  }
  pdf.setProperties({ title: `${c.name} · LPS ${CERT_TITLE}`, creator: 'USJ LPS Member Portal', subject: c.cert_no ?? '' })
  saveBlob(pdf.output('blob'), `${fileSafe(c.name)} LPS Certificate.pdf`)
}
