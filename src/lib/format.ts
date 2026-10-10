const d = (v: string) => new Date(v.length === 10 ? `${v}T12:00:00` : v)
export const fmtDate = (v?: string | null, o: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) => (v ? d(v).toLocaleDateString('en-US', o) : '')
export const fmtTime = (v?: string | null) => (v ? d(v).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '')
export const fmtWhen = (v: string) => `${fmtDate(v, { weekday: 'short', month: 'short', day: 'numeric' })} · ${fmtTime(v)}`
export const firstName = (n?: string | null) => (n ?? '').trim().split(/\s+/)[0] ?? ''
export const initials = (n?: string | null) => (n ?? '').trim().split(/\s+/).map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
export const greeting = (t = new Date()) => { const h = t.getHours(); return h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
export const ago = (v: string) => {
  const s = (Date.now() - new Date(v).getTime()) / 1000
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`
  return fmtDate(v)
}

/** Downloads an .ics file so the event lands in the phone's calendar. */
export function addToCalendar(e: { id: string; title: string; starts_at: string; ends_at: string | null; location: string | null; description: string | null }) {
  const z = (v: string) => new Date(v).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const end = e.ends_at ?? new Date(new Date(e.starts_at).getTime() + 60 * 60 * 1000).toISOString()
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//USJ LPS//Member Portal//EN', 'BEGIN:VEVENT', `UID:${e.id}@usjlps.org`, `DTSTAMP:${z(new Date().toISOString())}`,
    `DTSTART:${z(e.starts_at)}`, `DTEND:${z(end)}`, `SUMMARY:${esc(`LPS · ${e.title}`)}`, e.location ? `LOCATION:${esc(e.location)}` : '', e.description ? `DESCRIPTION:${esc(e.description.slice(0, 900))}` : '',
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  a.download = `${e.title.replace(/[^\w]+/g, '-').slice(0, 40) || 'lps-event'}.ics`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
