begin;
-- Only presentation assets: these URLs are public. Never upload private records.
alter table public.announcements add column if not exists email_images jsonb not null default '[]'::jsonb;

create or replace function public.valid_announcement_images(images jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare i jsonb; seen text[] := '{}';
begin
  if jsonb_typeof(images) <> 'array' then return false; end if;
  if jsonb_array_length(images) > 6 then return false; end if;
  for i in select value from jsonb_array_elements(images) loop
    if jsonb_typeof(i) <> 'object'
      or jsonb_typeof(i->'id') is distinct from 'string'
      or (i->>'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or (i->>'id') = any(seen)
      or jsonb_typeof(i->'path') is distinct from 'string'
      or (i->>'path') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$'
      or jsonb_typeof(i->'alt') is distinct from 'string'
      or length(i->>'alt') > 180
      or jsonb_typeof(i->'width') is distinct from 'number'
      or (i->>'width') not in ('160', '320', '512') then return false;
    end if;
    seen := array_append(seen, i->>'id');
  end loop;
  return true;
end $$;
alter table public.announcements drop constraint if exists announcements_email_images_valid;
alter table public.announcements add constraint announcements_email_images_valid
  check (public.valid_announcement_images(email_images));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('announcement-images', 'announcement-images', true, 1048576, array['image/png','image/jpeg'])
on conflict(id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Same authors as announcements, only in their own auth-user folder.
-- Immutable objects: no client UPDATE or DELETE; old email assets keep working.
drop policy if exists "announcement-images: upload own" on storage.objects;
create policy "announcement-images: upload own" on storage.objects for insert to authenticated
with check (
  bucket_id = 'announcement-images'
  and public.can_announce()
  and public.current_profile_id() is not null
  and split_part(name, '/', 1) = auth.uid()::text
  and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg)$'
);
drop policy if exists "announcement-images: read" on storage.objects;
create policy "announcement-images: read" on storage.objects for select to authenticated
using (bucket_id = 'announcement-images' and public.current_profile_id() is not null);
commit;