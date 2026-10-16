import { useState } from 'react'
import { useEventGuests, useGuestLogo, type MemberEvent, type EventGuest } from '@/lib/api'

function GuestCard({ guest }: { guest: EventGuest }) {
  const logo = useGuestLogo(guest.guest_logo_path)
  const [failedUrl, setFailedUrl] = useState<string | undefined>()
  const showLogo = logo.data && failedUrl !== logo.data
  return <aside className={`featured-guest${showLogo ? ' has-logo' : ''}`} aria-label="Guest speaker">
    <span className="featured-guest-badge">Guest speaker</span>
    {showLogo && <div className="featured-guest-logo"><img src={logo.data} alt={`${guest.guest_company || 'Guest company'} logo`} onError={() => setFailedUrl(logo.data)} /></div>}
    <div className="featured-guest-copy">
      {guest.guest_name && <strong>{guest.guest_name}</strong>}
      {guest.guest_role && <span>{guest.guest_role}</span>}
      {guest.guest_company && <b>{guest.guest_company}</b>}
    </div>
    {guest.guest_description && <p className="featured-guest-description">{guest.guest_description}</p>}
  </aside>
}
export function FeaturedGuest({ event }: { event: Pick<MemberEvent, 'kind' | 'id'> }) {
  const q = useEventGuests()
  const guest = q.data?.find(g => g.id === event.id && g.kind === event.kind)
  if (!guest) return null // Optional enhancement must not block the event or RSVP.
  return <GuestCard key={`${guest.kind}:${guest.id}`} guest={guest} />
}
