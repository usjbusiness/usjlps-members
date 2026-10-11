// Shrinks a photo in the browser before upload (keeps pages fast, strips EXIF location).
export async function shrinkImage(file: File, maxW: number, maxH: number, square = false): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|gif|heic|heif|avif)$/i.test(file.type) && !/\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name)) throw new Error('Choose a photo (JPG, PNG or WebP).')
  if (file.size > 25 * 1024 * 1024) throw new Error('That photo is over 25 MB. Choose a smaller one.')
  let img: ImageBitmap | HTMLImageElement
  try { img = await createImageBitmap(file) } catch {
    img = await new Promise<HTMLImageElement>((res, rej) => {
      const el = new Image(); el.onload = () => res(el); el.onerror = () => rej(new Error('This photo format is not supported here. Try a JPG or PNG.'))
      el.src = URL.createObjectURL(file)
    })
  }
  const W = img.width, H = img.height
  let sx = 0, sy = 0, sw = W, sh = H
  if (square) { const s = Math.min(W, H); sx = (W - s) / 2; sy = (H - s) / 2; sw = sh = s }
  const k = Math.min(1, maxW / sw, maxH / sh)
  const c = document.createElement('canvas'); c.width = Math.round(sw * k); c.height = Math.round(sh * k)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height)
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not read this photo.'))), 'image/jpeg', 0.86))
}
