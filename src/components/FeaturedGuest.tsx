import { useState } from 'react'
import { useEventGuests, useGuestLogo, type MemberEvent, type EventGuest, type GuestBrand } from '@/lib/api'
import { resolveGuestMedia } from '@/lib/guestMedia'

function BrandLogo({ brand }: { brand: GuestBrand }) {
  const logo = useGuestLogo(brand.path)
  const [failedUrl, setFailedUrl] = useState<string>()
  const [isWide, setIsWide] = useState(brand.shape === 'wide')
  const show = !!logo.data && logo.data !== failedUrl
  return <li className={`guest-brand${isWide ? ' is-wide' : ''}`}>
    {show && <div className={`guest-brand-art on-${brand.background || 'light'}`}>
      <img src={logo.data} alt={`${brand.name} logo`} loading="lazy" decoding="async"
        onLoad={e => setIsWide(brand.shape ? brand.shape === 'wide' : e.currentTarget.naturalWidth / e.currentTarget.naturalHeight > 1.8)}
        onError={() => setFailedUrl(logo.data)} />
    </div>}
    <span className="guest-brand-name">{brand.name}</span>
  </li>
}

function GuestPortrait({ path, name }: { path: string; name: string }) {
  const photo = useGuestLogo(path)
  const [failedUrl, setFailedUrl] = useState<string>()
  if (!photo.data || photo.data === failedUrl) return null
  return <img className="guest-portrait" src={photo.data} alt={name} loading="lazy" decoding="async"
    onError={() => setFailedUrl(photo.data)} />
}

export function GuestCard({ guest }: { guest: EventGuest }) {
  const media = resolveGuestMedia(guest)
  const brands = media.logos?.filter(brand => brand.path?.trim() && brand.name?.trim()) ?? []
  return <aside className="featured-guest" aria-label="Guest speaker">
    <span className="featured-guest-badge">Guest speaker</span>
    <div className="guest-identity">
      {media.photo && <GuestPortrait path={media.photo} name={guest.guest_name || 'Guest speaker'} />}
      <div className="featured-guest-copy">
        {guest.guest_name && <strong>{guest.guest_name}</strong>}
        {guest.guest_role && <span>{guest.guest_role}</span>}
        {guest.guest_company && <b>{guest.guest_company}</b>}
      </div>
    </div>
    {brands.length > 0 && <ul className="guest-brand-list" aria-label="Guest organizations">
      {brands.map((brand, index) => <BrandLogo key={`${brand.path}:${index}`} brand={brand} />)}
    </ul>}
    {guest.guest_description && <p className="featured-guest-description">{guest.guest_description}</p>}
  </aside>
}

export function FeaturedGuest({ event }: { event: Pick<MemberEvent, 'kind' | 'id'> }) {
  const q = useEventGuests()
  const guest = q.data?.find(g => g.id === event.id && g.kind === event.kind)
  if (!guest) return null // Optional enhancement must not block the event or RSVP.
  return <GuestCard key={`${guest.kind}:${guest.id}`} guest={guest} />
}
