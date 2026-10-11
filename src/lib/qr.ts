import qrcode from 'qrcode-generator'
import { saveBlob } from './doc'

export const PUBLIC_BASE = 'https://members.usjlps.org/u/'
export const publicUrl = (slug: string) => `${PUBLIC_BASE}${slug}`

export function matrix(text: string) {
  const q = qrcode(0, 'H'); q.addData(text); q.make()
  const n = q.getModuleCount()
  return { n, dark: (r: number, c: number) => q.isDark(r, c) }
}
/** SVG path of the dark modules, leaving a hole in the middle for the crest. */
export function qrSvg(text: string) {
  const { n, dark } = matrix(text)
  const hole = Math.round(n * 0.26), h0 = Math.floor((n - hole) / 2)
  let d = ''
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (r >= h0 && r < h0 + hole && c >= h0 && c < h0 + hole) continue
    if (dark(r, c)) d += `M${c},${r}h1v1h-1z`
  }
  return { n, d, hole, h0 }
}
const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })

/** Printable PNG: QR with the LPS crest, the name and the society line. */
export async function downloadQrPng(text: string, name: string) {
  const { n, d, hole, h0 } = qrSvg(text)
  const S = 1200, pad = 90, mod = (S - pad * 2) / (n + 0), H = S + 210
  const c = document.createElement('canvas'); c.width = S; c.height = H
  const x = c.getContext('2d')!
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, H)
  x.fillStyle = '#0A0A0A'
  x.save(); x.translate(pad, pad); x.scale(mod, mod); x.fill(new Path2D(d)); x.restore()
  try {
    const img = await loadImg('/icons/icon-512.png')
    const box = hole * mod, bx = pad + h0 * mod, by = pad + h0 * mod
    x.save(); x.beginPath(); x.roundRect(bx + box * 0.06, by + box * 0.06, box * 0.88, box * 0.88, box * 0.2); x.clip()
    x.drawImage(img, bx + box * 0.06, by + box * 0.06, box * 0.88, box * 0.88); x.restore()
  } catch { /* crest is optional */ }
  x.textAlign = 'center'; x.fillStyle = '#0A0A0A'
  x.font = '600 64px Inter, Arial, sans-serif'; x.fillText(name, S / 2, S + 40)
  x.fillStyle = '#8C6E2C'; x.font = '500 34px Inter, Arial, sans-serif'; x.fillText('USJ Leadership & Professional Society', S / 2, S + 100)
  x.fillStyle = '#666'; x.font = '400 28px Inter, Arial, sans-serif'; x.fillText(text.replace(/^https:\/\//, ''), S / 2, S + 150)
  const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not create the image.'))), 'image/png'))
  saveBlob(blob, `${name} - LPS QR.png`)
}
