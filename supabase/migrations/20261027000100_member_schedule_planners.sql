-- Private, optional account backup for the course planner. No course registration.
begin;
create table if not exists public.member_schedule_planners (
 user_id uuid primary key references auth.users(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=500000),
 updated_at timestamptz not null default now()
);
alter table public.member_schedule_planners enable row level security;
revoke all on public.member_schedule_planners from public,anon;
grant select,insert,update,delete on public.member_schedule_planners to authenticated;
drop policy if exists planner_own_select on public.member_schedule_planners;
create policy planner_own_select on public.member_schedule_planners for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists planner_own_insert on public.member_schedule_planners;
create policy planner_own_insert on public.member_schedule_planners for insert to authenticated with check(user_id=(select auth.uid()));
drop policy if exists planner_own_update on public.member_schedule_planners;
create policy planner_own_update on public.member_schedule_planners for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists planner_own_delete on public.member_schedule_planners;
create policy planner_own_delete on public.member_schedule_planners for delete to authenticated using(user_id=(select auth.uid()));
create or replace function public.touch_schedule_planner() returns trigger language plpgsql set search_path=public,pg_temp as $$ begin new.updated_at=clock_timestamp(); return new; end; $$;
revoke all on function public.touch_schedule_planner() from public,anon,authenticated;
drop trigger if exists touch_schedule_planner on public.member_schedule_planners;
create trigger touch_schedule_planner before update on public.member_schedule_planners for each row execute function public.touch_schedule_planner();
commit;
