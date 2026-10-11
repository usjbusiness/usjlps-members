// Shrinks a photo in the browser before upload (keeps pages fast, strips EXIF location).
export async function shrinkImage(file: File, maxW: number, maxH: number, square = false, type: 'image/jpeg' | 'image/png' = 'image/jpeg'): Promise<Blob> {
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
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Could not read this photo.'))), type, 0.86))
}

/**
 * Logos: fits the whole logo (no cropping), removes a plain background
 * (white, black or any solid color touching the edges) and returns a transparent PNG.
 */
export async function logoImage(file: File, size = 360): Promise<Blob> {
  const src = await shrinkImage(file, 900, 900, false, 'image/png')
  const img = await createImageBitmap(src)
  const w = img.width, h = img.height
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, w, h); const px = data.data
  // 1. Is there a solid background along the edges?
  const edge: number[] = []
  for (let x = 0; x < w; x++) edge.push(x, (h - 1) * w + x)
  for (let y = 1; y < h - 1; y++) edge.push(y * w, y * w + w - 1)
  const opaque = edge.filter((i) => px[i * 4 + 3] > 200)
  if (opaque.length > edge.length * 0.6) {
    const ch = (o: number) => opaque.map((i) => px[i * 4 + o]).sort((a, b) => a - b)[Math.floor(opaque.length / 2)]
    const bg = [ch(0), ch(1), ch(2)]
    const dist = (i: number) => Math.max(Math.abs(px[i * 4] - bg[0]), Math.abs(px[i * 4 + 1] - bg[1]), Math.abs(px[i * 4 + 2] - bg[2]))
    const TOL = 42
    const close = opaque.filter((i) => dist(i) <= TOL).length
    if (close > opaque.length * 0.8) {
      // 2. Flood fill from the edges: background pixels become transparent.
      const seen = new Uint8Array(w * h); const stack: number[] = []
      for (const i of edge) if (px[i * 4 + 3] <= 200 || dist(i) <= TOL) { seen[i] = 1; stack.push(i) }
      while (stack.length) {
        const i = stack.pop()!; px[i * 4 + 3] = 0
        const x = i % w, y = (i - x) / w
        const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]
        for (const j of nb) if (j >= 0 && !seen[j] && (px[j * 4 + 3] <= 200 || dist(j) <= TOL)) { seen[j] = 1; stack.push(j) }
      }
      // 3. Soften the edge so there is no halo.
      for (let i = 0; i < w * h; i++) {
        if (seen[i] || px[i * 4 + 3] === 0) continue
        const x = i % w
        const near = (x > 0 && seen[i - 1]) || (x < w - 1 && seen[i + 1]) || (i >= w && seen[i - w]) || (i < w * (h - 1) && seen[i + w])
        if (near) { const d = dist(i); if (d < TOL * 2.2) px[i * 4 + 3] = Math.round(px[i * 4 + 3] * Math.min(1, (d - TOL) / (TOL * 1.2) + 0.15)) }
      }
      ctx.putImageData(data, 0, 0)
    }
  }
  // 4. Trim empty space and center in a square.
  const a = ctx.getImageData(0, 0, w, h).data
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (a[(y * w + x) * 4 + 3] > 16) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1 }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1
  const out = document.createElement('canvas'); out.width = out.height = size
  const o = out.getContext('2d')!; o.imageSmoothingQuality = 'high'
  const k = (size * 0.94) / Math.max(bw, bh)
  o.drawImage(c, x0, y0, bw, bh, (size - bw * k) / 2, (size - bh * k) / 2, bw * k, bh * k)
  return new Promise((res, rej) => out.toBlob((b) => (b ? res(b) : rej(new Error('Could not read this logo.'))), 'image/png'))
}
