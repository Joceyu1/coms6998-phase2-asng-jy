-- REVIEW ONLY. Run manually as the trusted database owner AFTER approval,
-- applying the additive admin migration, enabling Google OAuth, and signing in once with Google.
-- Replace the placeholder below with the exact intended Google account email.
-- This script is deliberately not exposed through an application route or RPC.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $bootstrap$
declare
  target_email constant text := 'REPLACE_WITH_YOUR_GOOGLE_EMAIL';
  target_user_id uuid;
  matching_users integer;
begin
  if target_email = 'REPLACE_WITH_YOUR_GOOGLE_EMAIL'
     or pg_catalog.btrim(target_email) = '' then
    raise exception 'Replace the target email placeholder with the intended Google account before running this script.';
  end if;

  select pg_catalog.count(*)::integer, pg_catalog.min(account.id::text)::uuid
  into matching_users, target_user_id
  from auth.users as account
  where pg_catalog.lower(account.email) = pg_catalog.lower(pg_catalog.btrim(target_email));

  if matching_users <> 1 then
    raise exception 'Expected exactly one existing Auth account for the selected email. Sign in with Google first and confirm the account in Supabase Auth.';
  end if;

  if not exists (
    select 1 from auth.identities as identity
    where identity.user_id = target_user_id
      and identity.provider = 'google'
      and identity.identity_data ->> 'email_verified' = 'true'
  ) then
    raise exception 'The selected account does not have a Google identity.';
  end if;

  if not exists (
    select 1 from auth.users as account
    where account.id = target_user_id
      and account.raw_app_meta_data ->> 'provider' = 'google'
      and account.email_confirmed_at is not null
  ) then
    raise exception 'The selected account was not created with Google as its primary provider; it does not satisfy this application''s strict Google-only policy.';
  end if;

  update public.profiles
  set is_superadmin = true
  where id = target_user_id;

  if not found then
    raise exception 'The selected account has no profile. Apply the reviewed admin migration and confirm the original profile-creation process first.';
  end if;

  raise notice 'Superadmin access enabled for the selected Google account. Sign in again to verify access.';
end;
$bootstrap$;

commit;
