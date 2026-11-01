// Hand-maintained row types mirroring /supabase/migrations.
// Regenerate with `supabase gen types typescript` if the schema grows.
export type BoardRole = 'president' | 'vice_president' | 'treasurer' | 'secretary' | 'events_chair' | 'marketing_chair' | 'partnerships_director' | 'faculty_advisor' | 'campus_activities' | 'major_lead'
export type PermLevel = 'none' | 'read' | 'write'
export type AppArea =
  | 'tasks' | 'calendar' | 'meetings' | 'minutes' | 'attendance' | 'members' | 'board' | 'events' | 'outreach'
  | 'budget' | 'marketing' | 'brand_assets' | 'documents' | 'reports' | 'activity' | 'settings' | 'users' | 'major_leads'

interface Stamped { id: string; created_at: string; updated_at?: string; created_by?: string | null; updated_by?: string | null }

export interface Profile extends Stamped {
  auth_user_id: string | null; full_name: string; email: string; role: BoardRole; position_title: string
  is_admin: boolean; is_active: boolean; major: string | null; grad_year: number | null; phone: string | null
  avatar_url: string | null; deactivated_at: string | null; signature_path?: string | null
}
export interface AcademicTerm extends Stamped { name: string; starts_on: string; ends_on: string; is_current: boolean }
export interface BoardTerm extends Stamped {
  profile_id: string | null; full_name: string; position: string; board_role: BoardRole | null; email: string | null
  major: string | null; grad_year: number | null; term_start: string; term_end: string | null; status: 'current' | 'former' | 'elect'; notes: string | null
}
export interface MemberApplication {
  id: string; first_name: string; last_name: string; email: string; major: string | null; grad_year: number | null
  interests: string[]; heard_from: string | null; message: string | null; status: 'pending' | 'approved' | 'declined'
  member_id: string | null; review_note: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string
}

export interface Member extends Stamped {
  full_name: string; email: string | null; major: string | null; grad_year: number | null; date_joined: string
  status: 'active' | 'suspended' | 'inactive' | 'graduated' | 'former'; interests: string[]; notes: string | null
  welcome_sent_at?: string | null; welcome_sent_by?: string | null
  suspended_at?: string | null; suspended_by?: string | null; suspension_reason?: string | null; suspension_details?: string | null; suspended_until?: string | null
}
export interface Meeting extends Stamped {
  title: string; meeting_type: 'general_body' | 'eboard'; starts_at: string; ends_at: string | null; location: string | null
  organizer_id: string | null; status: 'tentative' | 'scheduled' | 'confirmed' | 'completed' | 'postponed' | 'cancelled'; description: string | null
}
export interface AgendaItem extends Stamped { meeting_id: string; position: number; title: string; notes: string | null; owner_id: string | null }
export interface Minutes extends Stamped {
  meeting_id: string; discussion: string | null; decisions: string | null; votes: string | null; follow_ups: string | null
  status: 'draft' | 'approved'; recorded_by: string | null; approved_at: string | null
  sga_submitted_at?: string | null; sga_submitted_by?: string | null
}
export interface Attendance extends Stamped { meeting_id: string; member_id: string | null; profile_id: string | null; status: 'present' | 'absent' | 'excused'; note: string | null }
export type TaskStatus = 'not_started' | 'in_progress' | 'waiting' | 'completed'
export interface Task extends Stamped {
  title: string; notes: string | null; owner_id: string | null; area: string; departments: string[]; priority: 'low' | 'normal' | 'high' | 'urgent'
  status: TaskStatus; due_date: string | null; meeting_id: string | null; event_id: string | null
  completed_at: string | null; archived_at: string | null; is_overdue?: boolean; display_status?: string
}
export interface CalendarItem {
  source: 'entry' | 'meeting' | 'event' | 'task' | 'marketing'; source_id: string; title: string; entry_type: string
  starts_at: string; ends_at: string | null; all_day: boolean; location: string | null; owner_id: string | null; description: string | null
}
export interface EventRow extends Stamped {
  name: string; description: string | null; starts_at: string | null; ends_at: string | null; location: string | null
  lead_id: string | null; stage: string; expected_attendance: number | null; actual_attendance: number | null
  budget_amount: number | null; marketing_status: string; notes: string | null; post_event_notes: string | null
  is_collaboration?: boolean; collaboration_partner?: string | null; is_community_service?: boolean
}
export interface Contact extends Stamped {
  organization: string; org_type: string; contact_name: string | null; title: string | null; email: string | null; phone: string | null
  website: string | null; owner_id: string | null; first_contacted_on: string | null; last_contact_on: string | null
  next_follow_up_on: string | null; status: string; potential_event_id: string | null; notes: string | null
}
export interface Interaction { id: string; contact_id: string; occurred_on: string; channel: string; summary: string; profile_id: string | null; created_at: string }
export interface BudgetCategory extends Stamped { term_id: string; name: string; allocated_amount: number; sort_order: number; notes: string | null }
export interface BudgetSummaryRow { category_id: string; term_id: string; name: string; sort_order: number; allocated_amount: number; spent: number; committed: number; available: number }
export interface Transaction extends Stamped {
  txn_date: string; description: string; vendor: string | null; category_id: string; amount: number; submitted_by: string | null
  status: string; receipt_path: string | null; event_id: string | null; notes: string | null
}
export interface FundingRequest extends Stamped {
  term_id: string; title: string; funding_source: string; event_id: string | null; amount_requested: number; amount_approved: number | null
  status: string; submitted_on: string | null; decided_on: string | null; requested_by: string | null; notes: string | null
}
export interface MarketingItem extends Stamped {
  title: string; platform: string; content_type: string | null; owner_id: string | null; draft_date: string | null
  publish_date: string | null; status: string; event_id: string | null; caption: string | null
  media: string[]; publish_time: string | null; published_at: string | null; published_by: string | null
}
export interface FileRecord extends Stamped { title: string; description: string | null; storage_path: string | null; file_name: string | null; mime_type: string | null; size_bytes: number | null }
export interface BrandAsset extends FileRecord { asset_type: string }
export interface DocumentRow extends FileRecord { category: string; external_url: string | null; meeting_id: string | null; event_id: string | null }
export interface PlanningNote extends Stamped { title: string; body: string | null; pinned: boolean }
export interface ActivityRow { id: number; actor_id: string | null; actor_name: string; action: string; entity_type: string; entity_id: string | null; entity_label: string | null; details: Record<string, unknown> | null; created_at: string }
export interface SemesterReport extends Stamped {
  term_id: string; title: string; status: 'draft' | 'final'; stats_snapshot: Record<string, number> | null; finalized_at: string | null; finalized_by: string | null
  [section: string]: unknown
}
export type SemesterStats = Record<string, number | string | null>
export interface MemberBroadcast {
  id: string; announcement_id: string | null; subject: string; recipients: number; sent: number; failed: string[]
  sent_by: string | null; sender_name: string | null; sender_position: string | null; created_at: string
}
export interface Announcement extends Stamped {
  email_images?: import('./emailImages').EmailImage[]
  title: string; body: string; priority: 'normal' | 'important' | 'urgent'; audience: BoardRole[]; tags: string[]
  pinned: boolean; expires_on: string | null; author_id: string | null; author_name: string | null; author_position: string | null
}
export interface PresenterItem { id: string; title: string; minutes: number | null; speaker: string; points: string }
export interface PresenterSheet {
  id: string; meeting_id: string; author_id: string | null; title: string
  opening: string | null; closing: string | null; items: PresenterItem[]; created_at: string; updated_at: string
}

export type MajorRole = 'lead' | 'co_lead' | 'programs' | 'outreach' | 'content' | 'ambassador'
export interface MajorLead extends Stamped {
  full_name: string; email: string | null; major: string; major_role: MajorRole; grad_year: number | null
  status: 'active' | 'onboarding' | 'inactive'; profile_id: string | null; since: string | null; focus: string | null; notes: string | null
}
