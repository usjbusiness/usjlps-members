import type { EventGuest, GuestBrand } from './api'

export interface GuestMedia {
  photo?: string | null
  logos?: GuestBrand[]
}

/** Frontend-only overrides. Prefer a kind:id key for a specific event.
 * Name keys are useful until the event UUID is available. No biography is overridden.
 * Remove the corresponding override when the API starts returning these fields.
 */
export const guestMediaOverrides: Record<string, GuestMedia> = {
  'guest:andrey gears': {
    logos: [
      { name: 'RPB Gaming', path: '/guest-media/rpb-gaming.png', background: 'dark', shape: 'square' },
      { name: 'X TEAM', path: '/guest-media/x-team.png', background: 'dark', shape: 'wide' },
    ],
  },
}

export function resolveGuestMedia(guest: EventGuest): GuestMedia {
  const override = guestMediaOverrides[`${guest.kind}:${guest.id}`]
    ?? guestMediaOverrides[`guest:${guest.guest_name?.trim().toLowerCase()}`]
  const logos = guest.guest_logos ?? override?.logos
    ?? (guest.guest_logo_path ? [{ name: guest.guest_company || 'Guest organization', path: guest.guest_logo_path, background: 'light' as const }] : [])
  return { photo: guest.guest_photo_path ?? override?.photo, logos }
}
