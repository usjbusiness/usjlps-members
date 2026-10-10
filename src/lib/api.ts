import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'

export interface Sticker { kind: 'meeting' | 'award'; title: string; earned_on: string; value: number; headliner: boolean }
export interface ApparelRequest { id: string; item: 'cap' | 'polo'; size: string | null; color: string | null; status: string; created_at: string }
export interface Me {
  member: { id: string; full_name: string; email: string; major: string | null; grad_year: number | null; date_joined: string; interests: string[];
    directory_visible: boolean; directory_email: boolean; headline: string | null; linkedin_url: string | null } | null
  board: { id: string; full_name: string; email: string; role: string; position_title: string; major: string | null; grad_year: number | null; avatar_url: string | null; can_manage: boolean } | null
  major_roles: { major: string; major_role: string }[]
  stickers: Sticker[]
  total: number
  requests: ApparelRequest[]
  settings: { groupme_url?: string | null }
}
export interface Post { id: string; title: string; body: string; priority: 'normal' | 'important' | 'urgent'; pinned: boolean; link_url: string | null; link_label: string | null; expires_on: string | null; author_name: string | null; author_position: string | null; created_at: string }
export interface MemberEvent { id: string; kind: 'meeting' | 'event'; title: string; starts_at: string; ends_at: string | null; location: string | null; description: string | null; headliner: boolean; attended: boolean; status: string }
export interface Person { person_key: string; kind: 'advisor' | 'eboard' | 'major' | 'member'; full_name: string; title: string | null; role: string | null; major: string | null; grad_year: number | null; email: string | null; avatar_url: string | null; headline: string | null; linkedin_url: string | null; interests: string[]; sort: number; is_me: boolean }
export interface Proposal { id: string; title: string; category: string; description: string; timing: string | null; can_help: boolean; status: string; response: string | null; created_at: string }

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
export const useEvents = () => useQuery({ queryKey: ['events'], staleTime: 120_000, queryFn: () => rpc<MemberEvent[]>('member_events') })
export const useDirectory = () => useQuery({ queryKey: ['directory'], staleTime: 300_000, queryFn: () => rpc<Person[]>('member_directory') })
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
    const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path!, 60 * 60 * 24)
    if (error) throw error
    return data.signedUrl
  },
})

// ---- Ranks ---------------------------------------------------------------
export const RANKS = [
  { key: 'member', name: 'Member', min: 0, perk: 'Every event, the member portal, the library and the GroupMe chat.' },
  { key: 'bronze', name: 'Bronze', min: 3, perk: 'LPS apparel: a cap or a polo, requested right here in the portal.' },
  { key: 'silver', name: 'Silver', min: 6, perk: 'A signed LPS certificate for your résumé and LinkedIn.' },
  { key: 'gold', name: 'Gold', min: 10, perk: 'Priority seats and meet-and-greets with headline guests.' },
  { key: 'ivy', name: 'Ivy', min: 15, perk: 'Company trips, an e-board reference and the chance to co-host.' },
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
