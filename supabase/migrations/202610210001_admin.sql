-- REVIEW ONLY: this migration has NOT been executed.
-- Apply only after explicit approval, on the database used by the SIDE B app.
-- This is an additive admin layer for existing profiles / generations / votes.
-- It neither changes the original RLS policies nor broadens table/column grants.

begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Unknown or incompatible schemas must be investigated, not silently replaced.
do $guard$
declare
  item record;
begin
  if exists (select 1 from pg_catalog.pg_namespace where nspname = 'coms6998_admin_private') then
    raise exception 'The admin-private schema already exists. Review the existing admin migration before proceeding.';
  end if;
  for item in
    select * from (values
      ('profiles', 'id'), ('profiles', 'first_name'), ('profiles', 'last_name'), ('profiles', 'avatar_path'),
      ('generations', 'id'), ('generations', 'user_id'), ('generations', 'artist_id'),
      ('generations', 'mood'), ('generations', 'scene'), ('generations', 'prompt'),
      ('generations', 'title'), ('generations', 'caption'), ('generations', 'model'),
      ('generations', 'status'), ('generations', 'created_at'),
      ('votes', 'id'), ('votes', 'generation_id'), ('votes', 'user_id'),
      ('votes', 'value'), ('votes', 'created_at')
    ) as required(table_name, column_name)
  loop
    if not exists (
      select 1 from pg_catalog.pg_attribute as attribute
      join pg_catalog.pg_class as relation on relation.oid = attribute.attrelid
      join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'public' and relation.relname = item.table_name
        and relation.relkind in ('r', 'p') and relation.relrowsecurity
        and attribute.attname = item.column_name
        and attribute.attnum > 0 and not attribute.attisdropped
    ) then
      raise exception 'Required SIDE B schema or enabled RLS is missing for %.%. Confirm the original app database before applying this migration.', item.table_name, item.column_name;
    end if;
  end loop;
  if exists (
    select 1 from pg_catalog.pg_attribute
    where attrelid = 'public.profiles'::pg_catalog.regclass
      and attname = 'is_superadmin' and attnum > 0 and not attisdropped
  ) then
    raise exception 'profiles.is_superadmin already exists. Review its type, grants, policies, and current assignments before proceeding.';
  end if;
  if exists (
    select 1 from pg_catalog.pg_proc as routine
    join pg_catalog.pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public' and routine.proname in (
      'admin_current_profile', 'admin_profiles', 'admin_media', 'admin_media_item',
      'admin_votes', 'admin_dashboard', 'admin_create_media', 'admin_update_media', 'admin_delete_media'
    )
  ) then
    raise exception 'An admin RPC name already exists. Review it before applying this migration.';
  end if;
  if exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = 'public.profiles'::pg_catalog.regclass
      and tgname = 'coms6998_admin_protect_role' and not tgisinternal
  ) then
    raise exception 'The admin-role protection trigger already exists. Review it first.';
  end if;
end;
$guard$;

alter table public.profiles add column is_superadmin boolean not null default false;

create schema coms6998_admin_private;
revoke all on schema coms6998_admin_private from public, anon, authenticated;

-- These helpers read only trusted Auth records and the persisted role flag.
-- The request's auth.uid() remains the caller's identity inside SECURITY DEFINER.
-- The migration must be owned by the trusted database owner (normally postgres).
create function coms6998_admin_private.google_user_id()
returns uuid
language plpgsql stable security definer
set search_path = ''
set row_security = off
as $function$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null or not exists (
    select 1 from auth.users as account
    where account.id = caller_id
      and account.email_confirmed_at is not null
      and account.raw_app_meta_data ->> 'provider' = 'google'
      and exists (
        select 1 from auth.identities as identity
        where identity.user_id = account.id and identity.provider = 'google'
          and identity.identity_data ->> 'email_verified' = 'true'
      )
  ) then
    raise exception using errcode = '42501', message = 'A verified Google session is required.';
  end if;
  return caller_id;
end;
$function$;
revoke all on function coms6998_admin_private.google_user_id() from public, anon, authenticated;

create function coms6998_admin_private.require_superadmin()
returns uuid
language plpgsql stable security definer
set search_path = ''
set row_security = off
as $function$
declare
  caller_id uuid := coms6998_admin_private.google_user_id();
begin
  if not exists (
    select 1 from public.profiles as profile
    where profile.id = caller_id and profile.is_superadmin is true
  ) then
    raise exception using errcode = '42501', message = 'Superadmin access is required.';
  end if;
  return caller_id;
end;
$function$;
revoke all on function coms6998_admin_private.require_superadmin() from public, anon, authenticated;

-- Original column-level UPDATE grants already omit the new flag. This trigger
-- adds defense in depth without altering those grants or any original policy.
-- It is intentionally SECURITY INVOKER: the client role must not become postgres.
create function coms6998_admin_private.protect_superadmin_flag()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.is_superadmin is true then
      raise exception using errcode = '42501', message = 'Only trusted database administration can change superadmin access.';
    end if;
  elsif new.is_superadmin is distinct from old.is_superadmin then
    raise exception using errcode = '42501', message = 'Only trusted database administration can change superadmin access.';
  end if;
  return new;
end;
$function$;
revoke all on function coms6998_admin_private.protect_superadmin_flag() from public, anon, authenticated;

create trigger coms6998_admin_protect_role
before insert or update of is_superadmin on public.profiles
for each row execute function coms6998_admin_private.protect_superadmin_flag();

create function coms6998_admin_private.validate_page(p_page integer, p_search text default '')
returns void
language plpgsql immutable
set search_path = ''
as $function$
begin
  if p_page is null or p_page < 1 or p_page > 1000000 then
    raise exception using errcode = '22023', message = 'Page must be between 1 and 1000000.';
  end if;
  if pg_catalog.char_length(coalesce(p_search, '')) > 200 then
    raise exception using errcode = '22023', message = 'Search must be 200 characters or fewer.';
  end if;
end;
$function$;
revoke all on function coms6998_admin_private.validate_page(integer, text) from public, anon, authenticated;

create function coms6998_admin_private.normalize_media(p_data jsonb)
returns jsonb
language plpgsql immutable
set search_path = ''
as $function$
declare
  field_name text;
  artist text;
  mood_value text;
  scene_value text;
  prompt_value text;
  title_value text;
  caption_value text;
  model_value text;
  status_value text;
begin
  if p_data is null or pg_catalog.jsonb_typeof(p_data) <> 'object' then
    raise exception using errcode = '22023', message = 'Media data must be a JSON object.';
  end if;
  for field_name in select pg_catalog.jsonb_object_keys(p_data)
  loop
    if field_name not in ('artist_id', 'mood', 'scene', 'prompt', 'title', 'caption', 'model', 'status') then
      raise exception using errcode = '22023', message = 'Media data contains an unsupported field.';
    end if;
    if pg_catalog.jsonb_typeof(p_data -> field_name) not in ('string', 'null') then
      raise exception using errcode = '22023', message = 'Media fields must be text or null.';
    end if;
  end loop;
  artist := pg_catalog.btrim(coalesce(p_data ->> 'artist_id', ''));
  mood_value := pg_catalog.btrim(coalesce(p_data ->> 'mood', ''));
  scene_value := pg_catalog.btrim(coalesce(p_data ->> 'scene', ''));
  prompt_value := pg_catalog.btrim(coalesce(p_data ->> 'prompt', ''));
  title_value := nullif(pg_catalog.btrim(coalesce(p_data ->> 'title', '')), '');
  caption_value := nullif(pg_catalog.btrim(coalesce(p_data ->> 'caption', '')), '');
  model_value := nullif(pg_catalog.btrim(coalesce(p_data ->> 'model', '')), '');
  status_value := coalesce(nullif(pg_catalog.btrim(p_data ->> 'status'), ''), 'pending');

  if artist not in (
    'tribe', 'de-la', 'wu-tang', 'nas', 'guy', 'bell-biv', 'janet', 'prodigy', 'orbital', '808',
    'tlc', 'xscape', 'swv', 'en-vogue', 'jodeci', 'hi-five', 'la-boyz', 'eyc', 'bobby-brown',
    'inner-city', 'underground-resistance', 'mary-j-blige', 'jeff-mills', '2-unlimited',
    'snap', 'culture-beat', 'real-mccoy', 'dead-or-alive', 'dave-rodgers', 'sinitta'
  ) then
    raise exception using errcode = '22023', message = 'Choose a supported SIDE B artist.';
  end if;
  if pg_catalog.char_length(mood_value) not between 1 and 80
     or pg_catalog.char_length(scene_value) not between 1 and 80
     or pg_catalog.char_length(prompt_value) not between 1 and 5000 then
    raise exception using errcode = '22023', message = 'Mood and scene require 1-80 characters; prompt requires 1-5000.';
  end if;
  if pg_catalog.char_length(title_value) > 90 or pg_catalog.char_length(caption_value) > 900
     or pg_catalog.char_length(model_value) > 100 then
    raise exception using errcode = '22023', message = 'Title, caption, or model exceeds its allowed length.';
  end if;
  if status_value not in ('pending', 'published', 'failed') then
    raise exception using errcode = '22023', message = 'Choose a valid generation status.';
  end if;
  if status_value = 'published' and (title_value is null or caption_value is null or model_value is null) then
    raise exception using errcode = '22023', message = 'Published generations require a title, liner note, and model.';
  end if;
  return pg_catalog.jsonb_build_object(
    'artist_id', artist, 'mood', mood_value, 'scene', scene_value, 'prompt', prompt_value,
    'title', title_value, 'caption', caption_value, 'model', model_value, 'status', status_value
  );
end;
$function$;
revoke all on function coms6998_admin_private.normalize_media(jsonb) from public, anon, authenticated;

create function public.admin_current_profile()
returns table (id uuid, is_superadmin boolean)
language plpgsql stable security definer
set search_path = ''
set row_security = off
as $function$
declare
  caller_id uuid := coms6998_admin_private.google_user_id();
begin
  return query select profile.id, profile.is_superadmin
  from public.profiles as profile where profile.id = caller_id;
end;
$function$;
revoke all on function public.admin_current_profile() from public, anon, authenticated;
grant execute on function public.admin_current_profile() to authenticated;

create function public.admin_profiles(p_page integer default 1, p_search text default '')
returns jsonb
language plpgsql stable security definer
set search_path = ''
set row_security = off
as $function$
declare
  query_text text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_search, '')));
begin
  perform coms6998_admin_private.require_superadmin();
  perform coms6998_admin_private.validate_page(p_page, p_search);
  return pg_catalog.jsonb_build_object(
    'total', (select pg_catalog.count(*) from public.profiles as profile
      where query_text = '' or pg_catalog.strpos(pg_catalog.lower(coalesce(profile.first_name::text, '') || ' ' || coalesce(profile.last_name::text, '')), query_text) > 0),
    'rows', coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(entry) order by pg_catalog.lower(coalesce(entry.first_name, '')), pg_catalog.lower(coalesce(entry.last_name, '')), entry.id)
      from (select profile.id, profile.first_name::text, profile.last_name::text, profile.avatar_path::text, profile.is_superadmin
        from public.profiles as profile
        where query_text = '' or pg_catalog.strpos(pg_catalog.lower(coalesce(profile.first_name::text, '') || ' ' || coalesce(profile.last_name::text, '')), query_text) > 0
        order by pg_catalog.lower(coalesce(profile.first_name::text, '')), pg_catalog.lower(coalesce(profile.last_name::text, '')), profile.id
        limit 20 offset (p_page - 1) * 20) as entry), '[]'::jsonb)
  );
end;
$function$;
revoke all on function public.admin_profiles(integer,text) from public, anon, authenticated;
grant execute on function public.admin_profiles(integer,text) to authenticated;

create function public.admin_media(p_page integer default 1, p_search text default '', p_status text default '')
returns jsonb
language plpgsql stable security definer
set search_path = ''
set row_security = off
as $function$
declare
  query_text text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_search, '')));
  status_filter text := pg_catalog.btrim(coalesce(p_status, ''));
begin
  perform coms6998_admin_private.require_superadmin();
  perform coms6998_admin_private.validate_page(p_page, p_search);
  if status_filter not in ('', 'pending', 'published', 'failed') then
    raise exception using errcode = '22023', message = 'Choose a valid status filter.';
  end if;
  return pg_catalog.jsonb_build_object(
    'total', (select pg_catalog.count(*) from public.generations as media where (status_filter = '' or media.status = status_filter) and (query_text = '' or pg_catalog.strpos(pg_catalog.lower(coalesce(media.title, '') || ' ' || coalesce(media.caption, '') || ' ' || media.artist_id || ' ' || media.mood || ' ' || media.scene), query_text) > 0)),
    'rows', coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(entry) order by entry.created_at desc, entry.id desc)
      from (select media.id, media.user_id, media.artist_id, media.mood, media.scene, media.prompt, media.title, media.caption, media.model, media.status, media.created_at from public.generations as media where (status_filter = '' or media.status = status_filter) and (query_text = '' or pg_catalog.strpos(pg_catalog.lower(coalesce(media.title, '') || ' ' || coalesce(media.caption, '') || ' ' || media.artist_id || ' ' || media.mood || ' ' || media.scene), query_text) > 0)
        order by media.created_at desc, media.id desc limit 20 offset (p_page - 1) * 20) as entry), '[]'::jsonb)
  );
end;
$function$;
revoke all on function public.admin_media(integer,text,text) from public, anon, authenticated;
grant execute on function public.admin_media(integer,text,text) to authenticated;

create function public.admin_media_item(p_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = ''
set row_security = off
as $function$
begin
  perform coms6998_admin_private.require_superadmin();
  if p_id is null then
    raise exception using errcode = '22023', message = 'A generation ID is required.';
  end if;
  return (select pg_catalog.to_jsonb(entry) from (select media.id, media.user_id, media.artist_id, media.mood, media.scene, media.prompt, media.title, media.caption, media.model, media.status, media.created_at
    from public.generations as media where media.id = p_id) as entry);
end;
$function$;
revoke all on function public.admin_media_item(uuid) from public, anon, authenticated;
grant execute on function public.admin_media_item(uuid) to authenticated;

create function public.admin_votes(p_page integer default 1)
returns jsonb
language plpgsql stable security definer
set search_path = ''
set row_security = off
as $function$
begin
  perform coms6998_admin_private.require_superadmin();
  perform coms6998_admin_private.validate_page(p_page);
  return pg_catalog.jsonb_build_object(
    'total', (select pg_catalog.count(*) from public.votes),
    'rows', coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(entry) order by entry.created_at desc, entry.id desc)
      from (select vote.id, vote.generation_id, vote.user_id, vote.value, vote.created_at
        from public.votes as vote order by vote.created_at desc, vote.id desc
        limit 20 offset (p_page - 1) * 20) as entry), '[]'::jsonb)
  );
end;
$function$;
revoke all on function public.admin_votes(integer) from public, anon, authenticated;
grant execute on function public.admin_votes(integer) to authenticated;

create function public.admin_dashboard()
returns jsonb
language plpgsql stable security definer
set search_path = ''
set row_security = off
as $function$
declare
  today_utc date := (pg_catalog.now() at time zone 'UTC')::date;
begin
  perform coms6998_admin_private.require_superadmin();
  return pg_catalog.jsonb_build_object(
    'total_profiles', (select pg_catalog.count(*) from public.profiles),
    'total_media', (select pg_catalog.count(*) from public.generations),
    'total_votes', (select pg_catalog.count(*) from public.votes),
    'upvotes', (select pg_catalog.count(*) from public.votes where value = 1),
    'downvotes', (select pg_catalog.count(*) from public.votes where value = -1),
    'published_media', (select pg_catalog.count(*) from public.generations where status = 'published'),
    'unrated_media', (select pg_catalog.count(*) from public.generations as media
      where not exists (select 1 from public.votes as vote where vote.generation_id = media.id)),
    'activity', (select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('label', pg_catalog.to_char(day, 'YYYY-MM-DD'), 'value', vote_count) order by day)
      from (select today_utc - days.day_offset as day, (select pg_catalog.count(*) from public.votes as vote
          where vote.created_at >= ((today_utc - days.day_offset)::timestamp at time zone 'UTC')
            and vote.created_at < ((today_utc - days.day_offset + 1)::timestamp at time zone 'UTC')) as vote_count
        from pg_catalog.generate_series(0, 6) as days(day_offset)) as activity),
    'types', (select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('label', status_value, 'value', media_count) order by position)
      from (select statuses.status_value, statuses.position, (select pg_catalog.count(*) from public.generations as media where media.status = statuses.status_value) as media_count
        from (values ('published', 1), ('pending', 2), ('failed', 3)) as statuses(status_value, position)) as distribution),
    'top_media', coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(entry) order by entry.votes desc, entry.upvotes desc, entry.id)
      from (select media.id, media.title, media.status,
          pg_catalog.count(vote.id) as votes,
          pg_catalog.count(vote.id) filter (where vote.value = 1) as upvotes,
          pg_catalog.count(vote.id) filter (where vote.value = -1) as downvotes
        from public.generations as media join public.votes as vote on vote.generation_id = media.id
        group by media.id, media.title, media.status
        order by votes desc, upvotes desc, media.id limit 5) as entry), '[]'::jsonb)
  );
end;
$function$;
revoke all on function public.admin_dashboard() from public, anon, authenticated;
grant execute on function public.admin_dashboard() to authenticated;

create function public.admin_create_media(p_data jsonb)
returns uuid
language plpgsql security definer
set search_path = ''
set row_security = off
as $function$
declare
  caller_id uuid := coms6998_admin_private.require_superadmin();
  normalized jsonb;
  created_id uuid;
begin
  normalized := coms6998_admin_private.normalize_media(p_data);
  insert into public.generations (user_id, artist_id, mood, scene, prompt, title, caption, model, status)
  values (caller_id, normalized ->> 'artist_id', normalized ->> 'mood', normalized ->> 'scene',
    normalized ->> 'prompt', normalized ->> 'title', normalized ->> 'caption', normalized ->> 'model', normalized ->> 'status')
  returning id into created_id;
  return created_id;
end;
$function$;
revoke all on function public.admin_create_media(jsonb) from public, anon, authenticated;
grant execute on function public.admin_create_media(jsonb) to authenticated;

create function public.admin_update_media(p_id uuid, p_data jsonb)
returns uuid
language plpgsql security definer
set search_path = ''
set row_security = off
as $function$
declare
  normalized jsonb;
  updated_id uuid;
begin
  perform coms6998_admin_private.require_superadmin();
  if p_id is null then
    raise exception using errcode = '22023', message = 'A generation ID is required.';
  end if;
  normalized := coms6998_admin_private.normalize_media(p_data);
  update public.generations as media
  set artist_id = normalized ->> 'artist_id', mood = normalized ->> 'mood', scene = normalized ->> 'scene',
    prompt = normalized ->> 'prompt', title = normalized ->> 'title', caption = normalized ->> 'caption',
    model = normalized ->> 'model', status = normalized ->> 'status'
  where media.id = p_id returning media.id into updated_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'The generation was not found.';
  end if;
  return updated_id;
end;
$function$;
revoke all on function public.admin_update_media(uuid,jsonb) from public, anon, authenticated;
grant execute on function public.admin_update_media(uuid,jsonb) to authenticated;

create function public.admin_delete_media(p_id uuid)
returns uuid
language plpgsql security definer
set search_path = ''
set row_security = off
as $function$
declare
  deleted_id uuid;
begin
  perform coms6998_admin_private.require_superadmin();
  if p_id is null then
    raise exception using errcode = '22023', message = 'A generation ID is required.';
  end if;
  delete from public.generations as media where media.id = p_id returning media.id into deleted_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'The generation was not found.';
  end if;
  -- The original votes foreign key cascades deletion; the UI must confirm this.
  return deleted_id;
end;
$function$;
revoke all on function public.admin_delete_media(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_media(uuid) to authenticated;

-- No grants on profiles/generations/votes and no original policies were changed.
-- There is intentionally no RPC for promoting profiles or editing ballots.
notify pgrst, 'reload schema';
commit;
