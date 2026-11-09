-- Private weekly planner; review and test policies before production.
begin;
create table if not exists public.member_weekly_items (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (char_length(trim(title)) between 1 and 120),
 day_date date not null,
 start_time time not null,
 end_time time not null check (end_time > start_time),
 location text not null default '' check (char_length(location) <= 160),
 repeat_weekly boolean not null default false,
 repeat_until date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (repeat_until is null or (repeat_weekly and repeat_until >= day_date))
);
create index if not exists member_weekly_items_owner_date_idx on public.member_weekly_items(user_id, day_date);
alter table public.member_weekly_items enable row level security;
revoke all on public.member_weekly_items from public, anon;
grant select, insert, update, delete on public.member_weekly_items to authenticated;
drop policy if exists weekly_owner_select on public.member_weekly_items;
create policy weekly_owner_select on public.member_weekly_items for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists weekly_owner_insert on public.member_weekly_items;
create policy weekly_owner_insert on public.member_weekly_items for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists weekly_owner_update on public.member_weekly_items;
create policy weekly_owner_update on public.member_weekly_items for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists weekly_owner_delete on public.member_weekly_items;
create policy weekly_owner_delete on public.member_weekly_items for delete to authenticated using (user_id=(select auth.uid()));
create or replace function public.member_weekly_touch_updated_at() returns trigger language plpgsql set search_path=public,pg_temp as $$begin new.updated_at=clock_timestamp();return new;end$$;
revoke all on function public.member_weekly_touch_updated_at() from public,anon,authenticated;
drop trigger if exists member_weekly_touch on public.member_weekly_items;
create trigger member_weekly_touch before update on public.member_weekly_items for each row execute function public.member_weekly_touch_updated_at();
commit;
