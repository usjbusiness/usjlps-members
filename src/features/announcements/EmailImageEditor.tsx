import { useEffect, useRef, useState } from 'react'
import { imageMarker, MAX_EMAIL_IMAGES, type EmailImage } from '@/lib/emailImages'
import { emailImageUrl, uploadEmailImage } from './emailImageUpload'
import './emailImages.css'

export function EmailImageEditor({ body, images, onChange, onBusy }: {
  body: string; images: EmailImage[]
  onChange: (body: string, images: EmailImage[]) => void
  onBusy: (busy: boolean) => void
}) {
  const textarea = useRef<HTMLTextAreaElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const alive = useRef(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { alive.current = true; return () => { alive.current = false; onBusy(false) } }, [onBusy])
  const active = images.filter(i => body.includes(imageMarker(i.id)))

  const add = async (file?: File) => {
    if (!file || busy) return
    if (active.length >= MAX_EMAIL_IMAGES) { setError('Use up to 6 images per announcement.'); return }
    const at = textarea.current?.selectionStart ?? body.length
    setBusy(true); onBusy(true); setError('')
    try {
      const image = await uploadEmailImage(file)
      if (!alive.current) return
      const marker = `\n\n${imageMarker(image.id)}\n\n`
      const next = body.slice(0, at) + marker + body.slice(at)
      if (next.length > 10000) throw new Error('The message is too long to insert an image. Shorten it and try again.')
      onChange(next, [...active, image])
      requestAnimationFrame(() => { textarea.current?.focus(); textarea.current?.setSelectionRange(at + marker.length, at + marker.length) })
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : 'Could not upload image. Your message has not changed.') }
    finally { if (alive.current) { setBusy(false); onBusy(false) }; if (input.current) input.current.value = '' }
  }
  const change = (image: EmailImage, patch: Partial<EmailImage>) => onChange(body, images.map(i => i.id === image.id ? { ...i, ...patch } : i))
  const remove = (id: string) => onChange(body.split(imageMarker(id)).join(''), images.filter(i => i.id !== id))
  return <div className="email-image-editor">
    <div className="email-image-toolbar">
      <button type="button" className="btn btn-secondary" onClick={() => input.current?.click()} disabled={busy || active.length >= MAX_EMAIL_IMAGES}>
        {busy ? 'Uploading image…' : '+ Add image / logo'}
      </button>
      <span>{active.length} / {MAX_EMAIL_IMAGES} images</span>
      <input ref={input} className="email-image-file" aria-label="Choose email image" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void add(e.target.files?.[0])} />
    </div>
    <p className="email-image-help" id="an-image-help">Place the cursor where you want the image, then upload. Each [[image:…]] line marks an image—move the whole line to reposition it. PNG, JPEG or WebP; up to 10 MB before automatic resizing. Public images only—no private records.</p>
    <textarea id="an-body" ref={textarea} rows={8} value={body} maxLength={10000} disabled={busy} aria-describedby="an-image-help"
      onChange={e => onChange(e.target.value, images)} placeholder="Write the announcement…" />
    {error && <div className="form-alert" role="alert">{error}</div>}
    <div aria-live="polite" className="email-image-status">{busy ? 'Preparing and uploading image. Your message is preserved.' : ''}</div>
    {active.map((image, index) => <div className="email-image-item" key={image.id}>
      <div className="email-image-thumb"><img src={emailImageUrl(image)} alt={image.alt || `Image ${index + 1}`} /></div>
      <div className="email-image-controls">
        <label htmlFor={`alt-${image.id}`}>Image {index + 1} · Description
          <input id={`alt-${image.id}`} value={image.alt} maxLength={180} disabled={busy} onChange={e => change(image, { alt: e.target.value })} placeholder="Describe the image for recipients" />
        </label>
        <label htmlFor={`width-${image.id}`}>Display size
          <select id={`width-${image.id}`} value={image.width} disabled={busy} onChange={e => change(image, { width: Number(e.target.value) as EmailImage['width'] })}>
            <option value={160}>Logo · small (160 px)</option>
            <option value={320}>Medium (320 px)</option>
            <option value={512}>Full width (512 px)</option>
          </select>
        </label>
        <button type="button" className="btn btn-ghost btn-danger-text" disabled={busy} onClick={() => remove(image.id)} aria-label={`Remove image ${index + 1}`}>Remove image</button>
      </div>
    </div>)}
    {active.length > 0 && <p className="email-image-help">Images are stored publicly for previews and embedded in sent emails. Upload only material you are allowed to share—never private records. Removing an image here does not erase it from already delivered emails.</p>}
  </div>
}