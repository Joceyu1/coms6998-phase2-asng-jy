-- Apply once as the trusted owner after reviewing the Week 7 changes.
-- Extends private avatar management only for verified Google superadmins.
-- The application still uses its publishable key and the signed-in user session.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $guard$
declare
  policy_name text;
begin
  if current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Install image administration through the trusted database owner.';
  end if;
  if pg_catalog.to_regprocedure('coms6998_admin_private.require_superadmin()') is null
     or pg_catalog.to_regclass('public.profiles') is null
     or pg_catalog.to_regclass('storage.objects') is null then
    raise exception 'The original application and reviewed admin layer must already exist.';
  end if;
  if not exists (select 1 from storage.buckets where id = 'avatars' and not public) then
    raise exception 'Expected private avatars bucket. Review storage setup first.';
  end if;
  if exists (select 1 from storage.buckets where id = 'avatars' and
      (file_size_limit is null or file_size_limit > 2097152
       or allowed_mime_types is null
       or not allowed_mime_types <@ array['image/jpeg','image/png','image/webp']::text[])) then
    raise exception 'Avatar limits must already allow only JPG/PNG/WebP up to 2 MiB.';
  end if;
  foreach policy_name in array array['side_b_avatar_guard', 'side_b_avatar_no_delete', 'columbia_avatars_guard'] loop
    if not exists (
      select 1 from pg_catalog.pg_policy
      where polrelid = 'storage.objects'::pg_catalog.regclass
        and polname = policy_name and not polpermissive
    ) then
      raise exception 'Expected restrictive avatar policy % is missing. Review the original storage rules.', policy_name;
    end if;
  end loop;
  if pg_catalog.to_regclass('public.admin_image_metadata') is not null
     or pg_catalog.to_regprocedure('public.admin_can_manage_images()') is not null
     or exists (select 1 from pg_catalog.pg_policy where polrelid = 'storage.objects'::pg_catalog.regclass and polname = 'coms6998_admin_avatar_management')
     or exists (select 1 from pg_catalog.pg_proc as p join pg_catalog.pg_namespace as n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('admin_images_list','admin_image_item','admin_image_metadata_update')) then
    raise exception 'Image administration already exists. Inspect the installed migration instead of replacing it.';
  end if;
  if not pg_catalog.has_table_privilege('authenticated', 'storage.objects', 'SELECT')
     or not pg_catalog.has_table_privilege('authenticated', 'storage.objects', 'INSERT')
     or not pg_catalog.has_table_privilege('authenticated', 'storage.objects', 'UPDATE')
     or not pg_catalog.has_table_privilege('authenticated', 'storage.objects', 'DELETE') then
    raise exception 'Expected standard authenticated Storage API privileges. Review them without broadening unrelated bucket access.';
  end if;
end;
$guard$;

create table public.admin_image_metadata (
  object_id uuid primary key references storage.objects(id) on delete cascade,
  display_name text check (display_name is null or (pg_catalog.btrim(display_name) <> '' and pg_catalog.char_length(display_name) <= 160)),
  alt_text text check (alt_text is null or pg_catalog.char_length(alt_text) <= 300),
  updated_at timestamptz not null default pg_catalog.now()
);
alter table public.admin_image_metadata enable row level security;
revoke all on public.admin_image_metadata from public, anon, authenticated;

-- This exposes only the requesting user's ability, never another profile or role.
-- False is essential: ordinary users must retain their existing avatar behavior.
create function public.admin_can_manage_images()
returns boolean language plpgsql stable security definer
set search_path = ''
set row_security = off
as $function$
begin
  perform coms6998_admin_private.require_superadmin();
  return true;
exception when insufficient_privilege then
  return false;
end;
$function$;
revoke all on function public.admin_can_manage_images() from public;
grant execute on function public.admin_can_manage_images() to anon, authenticated;

-- ALTER preserves the original policy commands/roles. The exception is confined
-- to this bucket and the trusted own-user capability; other buckets are unchanged.
alter policy side_b_avatar_guard on storage.objects
using (
  bucket_id <> 'avatars'
  or name = (select auth.uid())::text || '/avatar'
  or (bucket_id = 'avatars' and (select public.admin_can_manage_images()))
)
with check (
  bucket_id <> 'avatars'
  or name = (select auth.uid())::text || '/avatar'
  or (bucket_id = 'avatars' and (select public.admin_can_manage_images()))
);
alter policy side_b_avatar_no_delete on storage.objects
using (bucket_id <> 'avatars' or (bucket_id = 'avatars' and (select public.admin_can_manage_images())));
alter policy columbia_avatars_guard on storage.objects
using (
  bucket_id <> 'avatars'
  or (select public.is_columbia_google_user())
  or (bucket_id = 'avatars' and (select public.admin_can_manage_images()))
)
with check (
  bucket_id <> 'avatars'
  or (select public.is_columbia_google_user())
  or (bucket_id = 'avatars' and (select public.admin_can_manage_images()))
);
create policy coms6998_admin_avatar_management on storage.objects
for all to authenticated
using (bucket_id = 'avatars' and (select public.admin_can_manage_images()))
with check (bucket_id = 'avatars' and (select public.admin_can_manage_images()));

create function public.admin_images_list(p_page integer default 1, p_search text default '')
returns jsonb language plpgsql stable security definer
set search_path = '' set row_security = off
as $function$
declare
  matching_count bigint;
  result_rows jsonb;
  needle text;
begin
  perform coms6998_admin_private.require_superadmin();
  if p_page is null or p_page < 1 or p_page > 10000 or p_search is null or pg_catalog.char_length(p_search) > 100 then
    raise exception using errcode = '22023', message = 'Invalid image page or search.';
  end if;
  needle := '%' || pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  select pg_catalog.count(*) into matching_count
  from storage.objects as object
  left join public.admin_image_metadata as details on details.object_id = object.id
  where object.bucket_id = 'avatars'
    and (object.name ilike needle escape '\' or details.display_name ilike needle escape '\' or details.alt_text ilike needle escape '\');

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(entry) order by entry.created_at desc, entry.id), '[]'::jsonb)
  into result_rows from (
    select object.id, object.name,
      coalesce(details.display_name, pg_catalog.regexp_replace(object.name, '^.*/', '')) as display_name,
      coalesce(details.alt_text, '') as alt_text,
      coalesce(object.metadata ->> 'mimetype', object.metadata ->> 'contentType') as mime_type,
      case when object.metadata ->> 'size' ~ '^[0-9]{1,12}$' then (object.metadata ->> 'size')::bigint else null end as size,
      object.created_at, greatest(object.updated_at, details.updated_at) as updated_at,
      (select pg_catalog.count(*) from public.profiles as profile where profile.avatar_path = object.name) as referenced_profiles
    from storage.objects as object
    left join public.admin_image_metadata as details on details.object_id = object.id
    where object.bucket_id = 'avatars'
      and (object.name ilike needle escape '\' or details.display_name ilike needle escape '\' or details.alt_text ilike needle escape '\')
    order by object.created_at desc, object.id
    limit 20 offset (p_page - 1) * 20
  ) as entry;
  return pg_catalog.jsonb_build_object('rows', result_rows, 'total', matching_count);
end;
$function$;
revoke all on function public.admin_images_list(integer,text) from public, anon;
grant execute on function public.admin_images_list(integer,text) to authenticated;

create function public.admin_image_item(p_id uuid)
returns jsonb language plpgsql stable security definer
set search_path = '' set row_security = off
as $function$
declare result_row jsonb;
begin
  perform coms6998_admin_private.require_superadmin();
  select pg_catalog.jsonb_build_object(
    'id', object.id, 'name', object.name,
    'display_name', coalesce(details.display_name, pg_catalog.regexp_replace(object.name, '^.*/', '')),
    'alt_text', coalesce(details.alt_text, ''),
    'mime_type', coalesce(object.metadata ->> 'mimetype', object.metadata ->> 'contentType'),
    'size', case when object.metadata ->> 'size' ~ '^[0-9]{1,12}$' then (object.metadata ->> 'size')::bigint else null end,
    'created_at', object.created_at, 'updated_at', greatest(object.updated_at, details.updated_at),
    'referenced_profiles', (select pg_catalog.count(*) from public.profiles as profile where profile.avatar_path = object.name)
  ) into result_row
  from storage.objects as object
  left join public.admin_image_metadata as details on details.object_id = object.id
  where object.id = p_id and object.bucket_id = 'avatars';
  return result_row;
end;
$function$;
revoke all on function public.admin_image_item(uuid) from public, anon;
grant execute on function public.admin_image_item(uuid) to authenticated;

create function public.admin_image_metadata_update(p_id uuid, p_display_name text, p_alt_text text)
returns uuid language plpgsql security definer
set search_path = '' set row_security = off
as $function$
begin
  perform coms6998_admin_private.require_superadmin();
  if p_id is null or p_display_name is null or pg_catalog.btrim(p_display_name) = '' or pg_catalog.char_length(p_display_name) > 160
     or p_display_name ~ '[[:cntrl:]]' or pg_catalog.char_length(coalesce(p_alt_text,'')) > 300 or coalesce(p_alt_text,'') ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'Invalid image name or description.';
  end if;
  if not exists (select 1 from storage.objects where id = p_id and bucket_id = 'avatars') then
    raise exception using errcode = 'P0002', message = 'Image not found.';
  end if;
  insert into public.admin_image_metadata(object_id, display_name, alt_text)
  values(p_id, pg_catalog.btrim(p_display_name), nullif(pg_catalog.btrim(coalesce(p_alt_text,'')), ''))
  on conflict(object_id) do update set display_name = excluded.display_name, alt_text = excluded.alt_text, updated_at = pg_catalog.now();
  return p_id;
end;
$function$;
revoke all on function public.admin_image_metadata_update(uuid,text,text) from public, anon;
grant execute on function public.admin_image_metadata_update(uuid,text,text) to authenticated;

-- Storage API deletion removes the blob. This trigger only clears the stale
-- application reference and never deletes Storage rows itself.
create function coms6998_admin_private.detach_deleted_avatar()
returns trigger language plpgsql security definer
set search_path = '' set row_security = off
as $function$
begin
  if old.bucket_id = 'avatars' then
    update public.profiles set avatar_path = null where avatar_path = old.name;
  end if;
  return old;
end;
$function$;
revoke all on function coms6998_admin_private.detach_deleted_avatar() from public, anon, authenticated;
create trigger coms6998_admin_detach_avatar after delete on storage.objects
for each row execute function coms6998_admin_private.detach_deleted_avatar();

notify pgrst, 'reload schema';
commit;
