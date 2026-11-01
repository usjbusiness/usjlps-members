import { emailBodyParts, type EmailImage } from '@/lib/emailImages'
import { emailImageUrl } from './emailImageUpload'
import './emailImages.css'

export function AnnouncementBody({ body, images }: { body: string; images?: EmailImage[] }) {
  return <div className="announcement-rich-body">{emailBodyParts(body, images).map((part, n) =>
    'text' in part ? part.text.trim().split(/\n\s*\n/).filter(Boolean).map((text, m) => <p key={`${n}-${m}`}>{text}</p>) :
      <figure key={n}><img src={emailImageUrl(part.image)} width={part.image.width} alt={part.image.alt} loading="lazy" /></figure>
  )}</div>
}