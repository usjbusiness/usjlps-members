import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { Profile } from './profile'

export interface Sticker { kind: 'meeting' | 'award'; title: string; earned_on: string; value: number; headliner: boolean }
export interface ApparelRequest { id: string; item: 'cap' | 'pin' | 'polo'; size: string | null; color: string | null; status: string; created_at: string }
export interface Me {
  member: { id: string; full_name: string; email: string; major: string | null; grad_year: number | null; date_joined: string; interests: string[];
    directory_visible: boolean; directory_email: boolean; headline: string | null; linkedin_url: string | null } | null
  board: { id: string; full_name: string; email: string; role: string; position_title: string; major: string | null; grad_year: number | null; avatar_url: string | null; can_manage: boolean } | null
  major_roles: { major: string; major_role: string }[]
  stickers: Sticker[]
  total: number
  requests: ApparelRequest[]
  show_activity?: boolean
  settings: { groupme_url?: string | null }
}
export interface Post { id: string; title: string; body: string; priority: 'normal' | 'important' | 'urgent'; pinned: boolean; link_url: string | null; link_label: string | null; expires_on: string | null; author_name: string | null; author_position: string | null; created_at: string }
export interface MemberEvent { id: string; kind: 'meeting' | 'event'; title: string; starts_at: string; ends_at: string | null; location: string | null; description: string | null; headliner: boolean; attended: boolean; status: string }
export interface Person { person_key: string; kind: 'advisor' | 'eboard' | 'major' | 'member'; full_name: string; title: string | null; role: string | null; major: string | null; grad_year: number | null; email: string | null; avatar_url: string | null; headline: string | null; linkedin_url: string | null; interests: string[]; sort: number; is_me: boolean; last_seen_at: string | null; total?: number; activity?: 'seen' | 'never' | 'hidden' | null }
export interface Proposal { id: string; title: string; category: string; description: string; timing: string | null; can_help: boolean; status: string; response: string | null; created_at: string }

export interface Poll { id: string; question: string; details: string | null; multi: boolean; options: string[]; allow_other: boolean; closes_at: string | null;
  created_at: string; is_open: boolean; my_choices: number[] | null; my_other: string | null; counts: number[] | null; voters: number }
// Same list as the Join page (usjlps.org/join), so e-board statistics stay comparable.
export const INTERESTS = ['Leadership', 'Public Speaking', 'Networking', 'Career Readiness', 'Simulations', 'Entrepreneurship', 'Healthcare',
  'Business & Finance', 'Tech & Data', 'Media & Marketing', 'Education', 'Community Impact']

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw error
  return data as T
}

export const useMe = (enabled = true) => useQuery({ queryKey: ['me'], queryFn: () => rpc<Me | null>('member_me'), enabled, staleTime: 60_000 })
export const usePosts = () => useQuery({
  queryKey: ['posts'], staleTime: 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from('member_posts').select('id, title, body, priority, pinned, link_url, link_label, expires_on, author_name, author_position, created_at')
      .order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(60)
    if (error) throw error
    return (data ?? []) as Post[]
  },
})
export const useEvents = () => useQuery({ queryKey: ['events'], staleTime: 30_000, refetchInterval: 30_000, refetchOnWindowFocus: true, queryFn: () => rpc<MemberEvent[]>('member_events') })
export const useDirectory = () => useQuery({ queryKey: ['directory'], staleTime: 60_000, refetchInterval: 120_000, queryFn: () => rpc<Person[]>('member_directory') })
export const useProposals = () => useQuery({
  queryKey: ['proposals'],
  queryFn: async () => {
    const { data, error } = await supabase.from('event_proposals').select('id, title, category, description, timing, can_help, status, response, created_at').order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Proposal[]
  },
})
export interface LiveNow { live: boolean; title: string | null }
export const useLiveNow = () => useQuery({
  queryKey: ['live-now'], refetchInterval: 30_000,
  queryFn: async (): Promise<LiveNow> => {
    const { data, error } = await supabase.from('live_state').select('session_id, presentation_id, updated_at').eq('id', 1).maybeSingle()
    if (error || !data?.session_id) return { live: false, title: null }
    // A session nobody touched for 3 hours was simply never ended — do not show it as live.
    if (data.updated_at && Date.now() - new Date(data.updated_at as string).getTime() > 3 * 3600_000) return { live: false, title: null }
    let title: string | null = null
    if (data.presentation_id) {
      const { data: p } = await supabase.from('live_presentations').select('title').eq('id', data.presentation_id).maybeSingle()
      title = (p?.title as string | undefined) ?? null
    }
    return { live: true, title }
  },
})

/** Signed URL for an e-board photo stored in the private avatars bucket. */
export const useAvatar = (path: string | null | undefined) => useQuery({
  queryKey: ['avatar', path], enabled: !!path, staleTime: 1000 * 60 * 60 * 12,
  queryFn: async () => {
    if (/^https?:\/\//.test(path!)) return path!
    const media = path!.startsWith('member-media/')
    const { data, error } = await supabase.storage.from(media ? 'member-media' : 'avatars').createSignedUrl(media ? path!.slice(13) : path!, 60 * 60 * 24)
    if (error) throw error
    return data.signedUrl
  },
})

// ---- Ranks ---------------------------------------------------------------
export const RANKS = [
  { key: 'member', name: 'Member', min: 0, perk: 'Every event, the member portal, the library and the GroupMe chat.' },
  { key: 'bronze', name: 'Bronze', min: 3, perk: 'Unlock Bronze and Burgundy page headers. Your Bronze rank appears on your LPS profile — a visible recognition of your participation.' },
  { key: 'silver', name: 'Silver', min: 6, perk: 'The LPS polo and a signed LPS certificate for your résumé and LinkedIn (it also needs a finished résumé and a public LPS page or LinkedIn). Silver page headers.' },
  { key: 'gold', name: 'Gold', min: 10, perk: 'Priority seats and meet-and-greets with headline guests. The Gold certificate “with Distinction”. The Gold header and your own header photo.' },
  { key: 'ivy', name: 'Ivy', min: 15, perk: 'Company trips, an e-board reference and the chance to co-host. The Ivy certificate “with Highest Distinction”. The green Ivy headers.' },
] as const
export type Rank = (typeof RANKS)[number]
export function rankOf(total: number) {
  let i = 0
  RANKS.forEach((r, j) => { if (total >= r.min) i = j })
  const rank = RANKS[i]; const next = RANKS[i + 1] ?? null
  const pct = next ? Math.min(100, Math.round(((total - rank.min) / (next.min - rank.min)) * 100)) : 100
  return { rank, next, index: i, pct, toNext: next ? next.min - total : 0 }
}

// ---- Labels ----------------------------------------------------------------
export const ROLE_COLOR: Record<string, string> = {
  president: '#C9A54C', vice_president: '#C98E58', secretary: '#7E9BCB', treasurer: '#4FAE85',
  events_chair: '#A884CF', marketing_chair: '#D7799A', partnerships_director: '#4FB8B8',
  faculty_advisor: '#6FBF95', campus_activities: '#A7A7A7', major_lead: '#97B85E',
}
export const MAJOR_ROLE: Record<string, string> = {
  lead: 'Major Lead', co_lead: 'Co-Lead', programs: 'Programs Coordinator', outreach: 'Outreach Coordinator', content: 'Content Coordinator', ambassador: 'Ambassador',
}
export const CATEGORIES: { value: string; label: string; hint: string }[] = [
  { value: 'headliner', label: 'Headliner guest', hint: 'A speaker you would love to hear' },
  { value: 'simulation', label: 'Simulation', hint: 'A game, case or challenge' },
  { value: 'workshop', label: 'Workshop', hint: 'A skill to practice together' },
  { value: 'networking', label: 'Networking', hint: 'Meet professionals or alumni' },
  { value: 'trip', label: 'Company trip', hint: 'Visit a company or organization' },
  { value: 'social', label: 'Social', hint: 'Get to know each other' },
  { value: 'community', label: 'Community', hint: 'Give back on or off campus' },
  { value: 'other', label: 'Something else', hint: 'Surprise us' },
]
export const PROPOSAL_STATUS: Record<string, string> = { new: 'Sent', reviewing: 'Under review', planned: 'Planned', declined: 'Not this time' }
export const APPAREL_STATUS: Record<string, string> = { requested: 'Requested', ordered: 'Ordered', ready: 'Ready for pick-up', picked_up: 'Picked up', declined: 'Declined' }

// ---- My Notes (private to the author) ---------------------------------------
export interface Note { id: string; title: string; body: string; pinned: boolean; ref_kind: 'meeting' | 'event' | null; ref_id: string | null; ref_title: string | null; ref_date: string | null; created_at: string; updated_at: string }
export const useNotes = () => useQuery({
  queryKey: ['notes'], staleTime: 30_000,
  queryFn: async () => {
    const { data, error } = await supabase.from('member_notes').select('id, title, body, pinned, ref_kind, ref_id, ref_title, ref_date, created_at, updated_at')
      .order('pinned', { ascending: false }).order('updated_at', { ascending: false }).limit(500)
    if (error) throw error
    return (data ?? []) as Note[]
  },
})

// ---- Online / last seen ---------------------------------------------------
export const ONLINE_MS = 3 * 60_000
export const isOnline = (ts?: string | null) => !!ts && Date.now() - new Date(ts).getTime() < ONLINE_MS
/** "Online", "Active 5 min ago", "Active 3 h ago", "Active yesterday", "Active Oct 3". */
export function seenLabel(ts?: string | null) {
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < ONLINE_MS) return 'Online'
  const min = Math.round(diff / 60_000)
  if (min < 60) return `Active ${min} min ago`
  const h = Math.round(min / 60)
  if (h < 24) return `Active ${h} h ago`
  const d = Math.round(h / 24)
  if (d === 1) return 'Active yesterday'
  if (d < 7) return `Active ${d} days ago`
  return `Active ${new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

// ---- My Record -----------------------------------------------------------------
export interface History {
  member: { id: string; full_name: string; email: string; major: string | null; grad_year: number | null; date_joined: string } | null
  meetings: { id: string; title: string; starts_at: string; headliner: boolean; status: 'present' | 'absent' | 'excused' | null }[]
  awards: { title: string; earned_on: string; value: number; event: string | null; awarded_by: string | null; created_at: string }[]
  requests: { item: string; size: string | null; color: string | null; status: string; created_at: string; updated_at: string }[]
  generated_at: string
}
export const useHistory = () => useQuery({ queryKey: ['history'], staleTime: 60_000, queryFn: () => rpc<History>('member_history') })
export interface Resume0 { data: Record<string, unknown>; updated_at: string }
export const useResume = () => useQuery({
  queryKey: ['resume'], staleTime: Infinity, refetchOnWindowFocus: false,
  queryFn: async () => {
    const { data, error } = await supabase.from('member_resumes').select('data, updated_at').maybeSingle()
    if (error) throw error
    return (data ?? null) as Resume0 | null
  },
})

// ---- Member pages ------------------------------------------------------------
export interface PageInfo {
  bio: string | null; cover: string | null; avatar_path: string | null
  instagram: string | null; x_handle: string | null; tiktok: string | null; github: string | null; website: string | null
  show_resume: boolean; show_attendance: boolean; updated_at?: string; profile?: Profile
}
export interface PublicSettings { slug: string | null; is_public: boolean; public_resume: boolean; public_email: boolean; searchable: boolean; blocked: boolean; views: number }
export interface MemberPage {
  rows: Person[]; is_me: boolean; page: PageInfo | null; member_since: string | null; total: number
  attendance: { attended: number; last: { title: string; starts_at: string; headliner: boolean } | null } | null
  resume: Record<string, unknown> | null; has_resume: boolean
  /** Owner: full settings. Others: { slug } when the page is public. */
  public: (Partial<PublicSettings> & { slug: string | null }) | null
}
export interface PublicPage {
  slug: string; is_me: boolean; full_name: string; major: string | null; grad_year: number | null; headline: string | null; linkedin_url: string | null
  email: string | null; avatar: string | null; is_eboard: boolean; positions: { kind: 'eboard' | 'advisor' | 'major'; title: string | null; role: string | null; major?: string | null }[]
  member_since: string | null; total: number; attendance: MemberPage['attendance']
  page: Omit<PageInfo, 'avatar_path' | 'show_resume' | 'show_attendance'> & { profile: Profile }
  resume: Record<string, unknown> | null; searchable: boolean; views: number | null
}
export const usePublicPage = (slug: string) => useQuery({ queryKey: ['public', slug], staleTime: 60_000, refetchOnWindowFocus: false, retry: 1, queryFn: () => rpc<PublicPage | null>('public_member_page', { p_slug: slug }) })
export const useMemberPage = (key: string) => useQuery({ queryKey: ['page', key], staleTime: 30_000, queryFn: () => rpc<MemberPage | null>('member_page', { p_key: key }) })
/** Page headers. min = stickers needed; board = Executive Board only. Photo headers unlock at Gold. */
export const COVERS = [
  { key: 'onyx', label: 'Onyx', min: 0 }, { key: 'navy', label: 'Navy', min: 0 },
  { key: 'bronze', label: 'Bronze', min: 3 }, { key: 'burgundy', label: 'Burgundy', min: 3 },
  { key: 'silver', label: 'Silver', min: 6 }, { key: 'sapphire', label: 'Sapphire', min: 6 },
  { key: 'gold', label: 'Gold', min: 10 },
  { key: 'ivy', label: 'Ivy', min: 15 }, { key: 'dawn', label: 'Dawn', min: 15 },
  { key: 'executive', label: 'Executive', min: 0, board: true },
] as const
export const PHOTO_COVER_MIN = 10
const NOT_EBOARD = ['major_lead', 'faculty_advisor', 'campus_activities']
/** Student officers (not advisors or major leaders): they get the Executive header and every other one. */
export const isExecutive = (me: Me) => !!me.board && !NOT_EBOARD.includes(me.board.role)
/** Null when unlocked, otherwise a short "Silver · 6" style label. */
export function coverLock(key: string, total: number, exec: boolean): string | null {
  if (exec) return null
  const c = COVERS.find((x) => x.key === key)
  if (!c) return 'Locked'
  if ('board' in c && c.board) return 'E-Board only'
  return total >= c.min ? null : `${rankOf(c.min).rank.name} · ${c.min}`
}
/** Header shown until someone picks one: their rank's colour, or Executive for the e-board. */
export const defaultCover = (total: number, exec: boolean) => exec ? 'executive' : ({ member: 'onyx', bronze: 'bronze', silver: 'silver', gold: 'gold', ivy: 'ivy' } as const)[rankOf(total).rank.key]

// ---- LPS Certificate -------------------------------------------------------
export const CERT_MIN = 6
export interface CertChecks { total: number; need: number; rank_ok: boolean; resume_ok: boolean; resume_missing: string[]; page_ok: boolean; page_kind: 'public' | 'linkedin' | null; slug: string | null; linkedin: string | null; ok: boolean
  level: CertLevel | null; next_level: CertLevel | null; next_need: number | null }
export type CertLevel = 'silver' | 'gold' | 'ivy'
export interface CertInfo {
  level: CertLevel; status: 'requested' | 'issued' | 'declined'; cert_no: string | null; name: string; rank_key: string | null; total: number | null; attended: number | null
  requested_at: string; issued_at: string | null; note: string | null; president_name: string | null; advisor_name: string | null; advisor_title: string | null
  president_sig: string | null; advisor_sig: string | null
}
export interface MyCertificate { checks: CertChecks; full_name: string; member_since: string | null; cert: CertInfo | null; certs: CertInfo[] }
export const useCertificate = () => useQuery({ queryKey: ['certificate'], staleTime: 30_000, queryFn: () => rpc<MyCertificate | null>('member_certificate') })
export interface CertVerify { cert_no: string; valid: boolean; name: string; rank_key: string | null; issued_at: string | null; president_name: string | null; advisor_name: string | null; advisor_title: string | null }
export const useVerifyCertificate = (no: string) => useQuery({ queryKey: ['verify', no], enabled: !!no, retry: 1, refetchOnWindowFocus: false, queryFn: () => rpc<CertVerify | null>('verify_certificate', { p_no: no }) })
export const RESUME_MISSING: Record<string, string> = {
  resume: 'Start your résumé in the Résumé Builder', name: 'Your name', contact: 'Your email and phone number',
  education: 'Education with your school and degree', experience: 'At least one experience or leadership role with bullet points', skills: 'Skills or languages',
}

export const usePolls = () => useQuery({ queryKey: ['polls'], staleTime: 20_000, refetchInterval: 30_000, queryFn: () => rpc<Poll[]>('member_polls_list') })

// Optional, shared pre-registration; deliberately separate from attendance/stickers.
export interface EventPreregistration { id: string; kind: 'meeting' | 'event'; planning_count: number; my_planning: boolean }
export const useEventPreregistrations = () => useQuery({
  queryKey: ['event-preregistrations'], staleTime: 15_000, refetchInterval: 30_000,
  refetchOnWindowFocus: true, queryFn: () => rpc<EventPreregistration[]>('member_event_preregistrations'),
})
export const setEventPreregistration = (kind: MemberEvent['kind'], id: string, planning: boolean) =>
  rpc<void>('member_set_event_preregistration', { p_kind: kind, p_id: id, p_planning: planning })

// Explicitly published guest affiliation, independent of Headliner/stickers.
export interface EventGuest { id: string; kind: MemberEvent['kind']; guest_name: string | null; guest_role: string | null; guest_company: string | null; guest_logo_path: string | null }
export const useEventGuests = () => useQuery({
  queryKey: ['event-guests'], staleTime: 30_000, refetchInterval: 30_000, refetchOnWindowFocus: true,
  queryFn: () => rpc<EventGuest[]>('member_event_guests'),
})
export const useGuestLogo = (path: string | null | undefined) => useQuery({
  queryKey: ['guest-logo', path], enabled: !!path, staleTime: 30 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.storage.from('guest-logos').createSignedUrl(path!, 3600)
    if (error) throw error
    return data.signedUrl
  },
})
