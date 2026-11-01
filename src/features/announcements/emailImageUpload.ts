import { supabase } from '@/lib/supabase'
import { EMAIL_IMAGE_BUCKET, MAX_EMAIL_IMAGE_BYTES, type EmailImage } from '@/lib/emailImages'

export const emailImageUrl = (i: EmailImage) => supabase.storage.from(EMAIL_IMAGE_BUCKET).getPublicUrl(i.path).data.publicUrl

/** Decode and re-encode raster input; never upload SVG, HTML, or original metadata. */
export async function uploadEmailImage(file: File): Promise<EmailImage> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image. SVG and other file types are not supported.')
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.')
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Please sign in again before uploading.')
  let bmp: ImageBitmap
  try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }) }
  catch { throw new Error('This file could not be opened as an image. Try another PNG or JPEG.') }
  try {
    if (!bmp.width || !bmp.height || bmp.width * bmp.height > 25_000_000) throw new Error('Choose an image with fewer than 25 million pixels.')
    const mime = file.type === 'image/png' || file.type === 'image/webp' ? 'image/png' : 'image/jpeg'
    let blob: Blob | null = null
    for (const max of [1600, 1280, 1024, 800, 640]) {
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
      const c = document.createElement('canvas')
      c.width = Math.max(1, Math.round(bmp.width * scale)); c.height = Math.max(1, Math.round(bmp.height * scale))
      const ctx = c.getContext('2d')
      if (!ctx) throw new Error('Image processing is not available in this browser.')
      ctx.drawImage(bmp, 0, 0, c.width, c.height)
      blob = await new Promise<Blob | null>(resolve => c.toBlob(resolve, mime, 0.86))
      if (blob && blob.size <= MAX_EMAIL_IMAGE_BYTES) break
    }
    if (!blob || blob.size > MAX_EMAIL_IMAGE_BYTES) throw new Error('This image is too large after processing. Please use a smaller image.')
    const id = crypto.randomUUID()
    const path = `${user.id}/${id}.${mime === 'image/png' ? 'png' : 'jpg'}`
    const { error } = await supabase.storage.from(EMAIL_IMAGE_BUCKET).upload(path, blob, { contentType: mime, upsert: false, cacheControl: '31536000' })
    if (error) throw new Error(`Could not upload the image. Check that the email-images SQL migration is installed and your account can post announcements. ${error.message}`)
    return { id, path, alt: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 180), width: 512 }
  } finally { bmp.close() }
}