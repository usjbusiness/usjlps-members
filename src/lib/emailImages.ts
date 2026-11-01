// EMAIL_IMAGE_CORE_START
// This pure core is copied verbatim (without exports) into the two standalone
// Edge Functions. Keep in sync; email-images.test.cjs checks all three copies.
export interface EmailImage {
  id: string
  path: string
  alt: string
  width: 160 | 320 | 512
}
export const EMAIL_IMAGE_BUCKET = 'announcement-images'
export const MAX_EMAIL_IMAGES = 6
export const MAX_EMAIL_IMAGE_BYTES = 1_048_576
const imageUuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const imagePath = new RegExp(`^${imageUuid}/${imageUuid}\\.(png|jpg)$`)
const imageId = new RegExp(`^${imageUuid}$`)
export const imageMarker = (id: string) => `[[image:${id}]]`

export function validateEmailImages(value: unknown): EmailImage[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.length > MAX_EMAIL_IMAGES) throw new Error('Use up to 6 email images.')
  const ids = new Set<string>()
  return value.map((v: unknown) => {
    if (!v || typeof v !== 'object') throw new Error('Invalid email image.')
    const o = v as Record<string, unknown>
    if (typeof o.id !== 'string' || !imageId.test(o.id) || ids.has(o.id)
      || typeof o.path !== 'string' || !imagePath.test(o.path)
      || typeof o.alt !== 'string' || o.alt.length > 180
      || ![160, 320, 512].includes(Number(o.width)) || typeof o.width !== 'number') {
      throw new Error('Invalid email image. Upload the file again.')
    }
    ids.add(o.id)
    return { id: o.id, path: o.path, alt: o.alt, width: o.width as EmailImage['width'] }
  })
}

export type EmailBodyPart = { text: string } | { image: EmailImage }
export function emailBodyParts(body: string, value?: unknown): EmailBodyPart[] {
  const images = validateEmailImages(value)
  const byId = new Map(images.map(i => [i.id, i]))
  const pattern = new RegExp(`\\[\\[image:(${imageUuid})\\]\\]`, 'g')
  const parts: EmailBodyPart[] = []
  let cursor = 0
  for (const match of body.matchAll(pattern)) {
    if (match.index! > cursor) parts.push({ text: body.slice(cursor, match.index) })
    const image = byId.get(match[1])
    parts.push(image ? { image } : { text: '[Image unavailable]' })
    cursor = match.index! + match[0].length
  }
  if (cursor < body.length) parts.push({ text: body.slice(cursor) })
  return parts
}
export const imageEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export function emailBodyHtml(body: string, images: unknown, src: (image: EmailImage) => string, links = false): string {
  return emailBodyParts(body, images).map(part => {
    if ('image' in part) {
      const i = part.image
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;table-layout:fixed;width:100%;"><tr><td align="center"><img src="${imageEscape(src(i))}" alt="${imageEscape(i.alt)}" width="${i.width}" style="display:block;width:${i.width}px;max-width:100%;height:auto;border:0;margin:0 auto;"></td></tr></table>`
    }
    return part.text.trim().split(/\n\s*\n/).filter(Boolean).map(para => {
      let text = imageEscape(para).replace(/\r?\n/g, '<br>')
      if (links) text = text.replace(/https?:\/\/[^\s<]+/g, url => `<a href="${url}" style="color:#123F31;">${url}</a>`)
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.65;overflow-wrap:anywhere;">${text}</p>`
    }).join('')
  }).join('')
}
export function emailBodyText(body: string, images?: unknown): string {
  return emailBodyParts(body, images).map(p => 'text' in p ? p.text : `\n[Image: ${p.image.alt || 'Announcement image'}]\n`).join('')
}
// EMAIL_IMAGE_CORE_END