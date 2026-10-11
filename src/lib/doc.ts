// Shared helpers for generated documents (résumé and My Record).
import type { jsPDF } from 'jspdf'

export type Run = { text: string; b?: boolean; i?: boolean }

/** Saves a Blob as a file (works on desktop and phones). */
export function saveBlob(blob: Blob, name: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 8000)
}
export const fileSafe = (s: string) => s.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim() || 'LPS'

const FONTS: [string, string, string][] = [['Carlito-Regular.ttf', 'Carlito', 'normal'], ['Carlito-Bold.ttf', 'Carlito', 'bold'], ['Carlito-Italic.ttf', 'Carlito', 'italic'], ['Carlito-BoldItalic.ttf', 'Carlito', 'bolditalic']]
let fontData: Promise<[string, string][]> | null = null
function b64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf); let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}
/** New Letter-size PDF with Carlito (metric-compatible with Calibri). Falls back to Helvetica offline. */
export async function newPdf(): Promise<{ pdf: jsPDF; font: string }> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
  try {
    fontData ??= Promise.all(FONTS.map(async ([f]) => {
      const r = await fetch(`/fonts/${f}`); if (!r.ok) throw new Error('font')
      return [f, b64(await r.arrayBuffer())] as [string, string]
    }))
    const data = await fontData
    data.forEach(([f, d], i) => { pdf.addFileToVFS(f, d); pdf.addFont(f, FONTS[i][1], FONTS[i][2]) })
    pdf.setFont('Carlito', 'normal')
    return { pdf, font: 'Carlito' }
  } catch {
    fontData = null
    return { pdf, font: 'helvetica' }
  }
}
export const styleOf = (r: Run) => (r.b && r.i ? 'bolditalic' : r.b ? 'bold' : r.i ? 'italic' : 'normal')

/** Breaks styled runs into lines that fit maxW (word wrap across bold/italic runs). */
export function wrapRuns(pdf: jsPDF, font: string, size: number, runs: Run[], maxW: number): Run[][] {
  const words: Run[] = []
  runs.forEach((r) => r.text.split(/(\s+)/).forEach((w) => { if (w) words.push({ ...r, text: w }) }))
  const lines: Run[][] = [[]]; let w = 0
  const width = (r: Run) => { pdf.setFont(font, styleOf(r)); pdf.setFontSize(size); return pdf.getTextWidth(r.text) }
  for (const word of words) {
    const isSpace = /^\s+$/.test(word.text)
    const ww = width(word)
    if (!isSpace && w + ww > maxW && lines[lines.length - 1].length) {
      const last = lines[lines.length - 1]
      while (last.length && /^\s+$/.test(last[last.length - 1].text)) last.pop()
      lines.push([]); w = 0
    }
    if (isSpace && !lines[lines.length - 1].length) continue
    lines[lines.length - 1].push(word); w += ww
  }
  return lines
}
export function drawRuns(pdf: jsPDF, font: string, size: number, runs: Run[], x: number, y: number) {
  let cx = x
  for (const r of runs) { pdf.setFont(font, styleOf(r)); pdf.setFontSize(size); pdf.text(r.text, cx, y); cx += pdf.getTextWidth(r.text) }
  return cx
}

/** The LPS monogram as a PNG data URL (jsPDF cannot read WebP). */
export async function logoPng(src = '/img/mono-gold.webp', h = 240): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const img = new Image(); img.src = src
    await img.decode()
    const w = Math.round((img.naturalWidth / img.naturalHeight) * h)
    const c = document.createElement('canvas'); c.width = w; c.height = h
    c.getContext('2d')!.drawImage(img, 0, 0, w, h)
    return { data: c.toDataURL('image/png'), w, h }
  } catch { return null }
}
