-- LPS STEP 20: optional event pre-registration. Requires STEP 18.
-- One durable indication per signed-in person and event; not attendance or a seat guarantee.
begin;
create table if not exists public.event_preregistrations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 meeting_id uuid references public.meetings(id) on delete cascade,
 event_id uuid references public.events(id) on delete cascade,
 created_at timestamptz not null default now(),
 check (num_nonnulls(meeting_id,event_id)=1),
 unique(user_id,meeting_id), unique(user_id,event_id)
);
create index if not exists prereg_meeting_idx on public.event_preregistrations(meeting_id) where meeting_id is not null;
create index if not exists prereg_event_idx on public.event_preregistrations(event_id) where event_id is not null;
alter table public.event_preregistrations enable row level security;
revoke all on public.event_preregistrations from public,anon,authenticated;

create or replace function public.member_event_preregistrations()
returns table(id uuid,kind text,planning_count bigint,my_planning boolean)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null or not public.is_portal_member() then raise exception 'Pre-registration is for active LPS members only.'; end if;
 return query
 select e.id,e.kind,count(r.id),coalesce(bool_or(r.user_id=auth.uid()),false)
 from public.member_events() e
 left join public.event_preregistrations r on (e.kind='meeting' and r.meeting_id=e.id) or (e.kind='event' and r.event_id=e.id)
 group by e.id,e.kind;
end $$;

create or replace function public.member_set_event_preregistration(p_kind text,p_id uuid,p_planning boolean)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_status text; v_start timestamptz;
begin
 if auth.uid() is null or not public.is_portal_member() then raise exception 'Pre-registration is for active LPS members only.'; end if;
 if p_kind is null or p_kind not in ('meeting','event') or p_id is null or p_planning is null then raise exception 'Invalid pre-registration request.'; end if;
 -- Lock the source against simultaneous cancellation/rescheduling/deletion.
 if p_kind='meeting' then
  select m.status::text,m.starts_at into v_status,v_start from public.meetings m where m.id=p_id and m.meeting_type='general_body' for share;
 else
  select e.stage::text,e.starts_at into v_status,v_start from public.events e where e.id=p_id and e.stage::text in ('confirmed','upcoming','completed','cancelled') for share;
 end if;
 if v_status is null then raise exception 'This event is not available in the member portal.'; end if;
 -- Cancellation is allowed after a status/date change so people can withdraw their indication.
 if not p_planning then
  delete from public.event_preregistrations r where r.user_id=auth.uid() and ((p_kind='meeting' and r.meeting_id=p_id) or (p_kind='event' and r.event_id=p_id));
  return;
 end if;
 if v_start is null or v_start<=now() or v_status not in ('tentative','scheduled','confirmed','upcoming') then
  raise exception 'Pre-registration is closed for this event. Refresh the calendar for its latest status.';
 end if;
 insert into public.event_preregistrations(user_id,meeting_id,event_id)
 values(auth.uid(),case when p_kind='meeting' then p_id end,case when p_kind='event' then p_id end)
 on conflict do nothing;
end $$;
revoke all on function public.member_event_preregistrations(),public.member_set_event_preregistration(text,uuid,boolean) from public,anon;
grant execute on function public.member_event_preregistrations(),public.member_set_event_preregistration(text,uuid,boolean) to authenticated;
commit;
