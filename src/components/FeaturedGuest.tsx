import { useState } from 'react'
import { useEventGuests, useGuestLogo, type MemberEvent, type EventGuest, type GuestBrand } from '@/lib/api'
import { resolveGuestMedia } from '@/lib/guestMedia'

function BrandCover({ brand }: { brand: GuestBrand }) {
  const logo = useGuestLogo(brand.path)
  const [failedUrl, setFailedUrl] = useState<string>()
  if (!logo.data || logo.data === failedUrl) return null
  return <span className={`guest-cover-brand on-${brand.background || 'light'}`}>
    <img src={logo.data} alt={`${brand.name} logo`} loading="lazy" decoding="async"
      onError={() => setFailedUrl(logo.data)} />
  </span>
}

function GuestPortrait({ path, name }: { path: string; name: string }) {
  const photo = useGuestLogo(path)
  const [failedUrl, setFailedUrl] = useState<string>()
  if (!photo.data || photo.data === failedUrl) return null
  return <img className="guest-portrait" src={photo.data} alt={name} loading="lazy" decoding="async"
    onError={() => setFailedUrl(photo.data)} />
}

export function GuestCard({ guest, hideCover = false }: { guest: EventGuest; hideCover?: boolean }) {
  const media = resolveGuestMedia(guest)
  const brands = media.logos?.filter(brand => brand.path?.trim() && brand.name?.trim()) ?? []
  return <aside className="featured-guest" aria-label="Guest speaker">
    {!hideCover && brands.length > 0 && <div className={`guest-cover${brands.length > 1 ? ' is-multiple' : ''}`} aria-label="Guest organizations">
      {brands.slice(0, 2).map((brand, index) => <BrandCover key={`${brand.path}:${index}`} brand={brand} />)}
    </div>}
    <span className="featured-guest-badge">Guest speaker</span>
    <div className="guest-identity">
      {media.photo && <GuestPortrait path={media.photo} name={guest.guest_name || 'Guest speaker'} />}
      <div className="featured-guest-copy">
        {guest.guest_name && <strong>{guest.guest_name}</strong>}
        {guest.guest_role && <span>{guest.guest_role}</span>}
        {(guest.guest_company || brands.length > 0) && <b>{guest.guest_company || brands.map(brand => brand.name).join(' · ')}</b>}
      </div>
    </div>
    {guest.guest_description && <p className="featured-guest-description">{guest.guest_description}</p>}
  </aside>
}

export function FeaturedGuest({ event, coverOnly = false, hideCover = false }: { event: Pick<MemberEvent, 'kind' | 'id'>; coverOnly?: boolean; hideCover?: boolean }) {
  const q = useEventGuests()
  const guest = q.data?.find(g => g.id === event.id && g.kind === event.kind)
  if (!guest) return null // Optional enhancement must not block the event or RSVP.
  if (coverOnly) {
    const brands = (resolveGuestMedia(guest).logos ?? []).filter(brand => brand.path?.trim() && brand.name?.trim())
    return brands.length ? <div className={`guest-cover home-guest-cover${brands.length > 1 ? ' is-multiple' : ''}`} aria-label="Guest organizations">{brands.slice(0, 2).map((brand, index) => <BrandCover key={`${brand.path}:${index}`} brand={brand} />)}</div> : null
  }
  return <GuestCard key={`${guest.kind}:${guest.id}`} guest={guest} hideCover={hideCover} />
}
