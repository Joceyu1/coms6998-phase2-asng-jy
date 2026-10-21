# SIDE B admin database and Google-login setup

The user approved the additive migration and first-account bootstrap. After
manual SQL setup, the live API recognizes `admin_current_profile` and correctly
denies anonymous execution. Do not reapply the migration without checking the
existing installation. Google sign-in, first-account bootstrap, and authenticated
CRUD still require verification. This application uses a publishable key and
the signed-in user's session; it does not require a Supabase service-role key.

For automated one-time setup after approval, a Supabase account access token can
be supplied through the saved `SUPABASE_ACCESS_TOKEN` **network secret** in cloud
environment settings. Its only allowed destination is `api.supabase.com`. Create
it through <https://supabase.com/dashboard/account/tokens>, enter it securely in
settings, and never put it in chat, Git, or Vercel's app variables. This optional
management credential is used to apply approved SQL and add callback URLs; the
running application does not use it. Alternatively, the trusted owner can run
the reviewed SQL and configure callbacks manually through Supabase's dashboard.

## Confirm the database before applying anything

The original SIDE B creation/rating app's public schema is in
[`Joceyu1/hello-world-vercel-asng1-jy`](https://github.com/Joceyu1/hello-world-vercel-asng1-jy).
It creates AI-generated **text mixtape liner notes**, not image/audio uploads.
The relevant source migrations are
[`202610070001_side_b.sql`](https://github.com/Joceyu1/hello-world-vercel-asng1-jy/blob/main/supabase/migrations/202610070001_side_b.sql),
[`202610070002_expanded_catalog.sql`](https://github.com/Joceyu1/hello-world-vercel-asng1-jy/blob/main/supabase/migrations/202610070002_expanded_catalog.sql),
and the later Columbia-Google access migration.

There are two different project references in the available configuration:

| Source | Supabase project reference |
| --- | --- |
| Original creation/rating app README | `qrgjqpdvvbwmjpthpmlo` |
| Newly supplied admin environment | `zssjripfhjrptftwddla` |

The user selected the original app database, `qrgjqpdvvbwmjpthpmlo`. Its existing
publishable configuration was securely reused for ignored `.env.local` and the
new admin Vercel project's Production, Preview, and Development variables. No
original app settings or repository files were changed. Do not move data or
point the previous app at another project implicitly.
The newly supplied project did not expose the expected tables in zero-row API
checks. That does not establish that every database schema is empty.

[`202610210001_admin.sql`](../supabase/migrations/202610210001_admin.sql) is an
**additive migration for the existing SIDE B schema**. It intentionally fails
when that schema, enabled RLS, or expected columns are missing; it is not a
fresh-database migration. It must not be run against the unused new project.

The preflight also rejects existing admin helper/RPC names or an existing role
column, so it cannot silently replace unknown functions, overwrite role
assignments, or reuse an incompatible admin implementation. The migration runs
in a transaction and should be version-tracked after approved execution.

## Existing data and the additive admin layer

| Existing table | Meaning | Admin capability |
| --- | --- | --- |
| `profiles` | Auth-linked `id`, first/last names, avatar path | Read profiles through an authorized RPC. |
| `generations` | Artist, mood, scene, prompt, generated title/caption, model, status, creator, timestamp | Create/read/update/delete liner-note records. |
| `votes` | One immutable `-1` or `1` ballot per generation/user | Read individual votes and aggregate statistics. |

The migration adds only `profiles.is_superadmin` (non-null, initially `false`),
a role-protection trigger, a private helper schema, and narrowly scoped public
RPCs. It does not alter the existing RLS policies, broaden table or column
privileges, modify the original voting RPCs, or copy unrelated application data.
No initial user is automatically promoted.

The existing app publicly exposes only selected columns of published
`generations`; creator IDs remain excluded from its public column grants.
Individual votes and profiles remain owner-restricted through the original
rules. Its later Columbia-Google restrictive policies also remain unchanged.

Those restrictive policies cannot be overridden with an ordinary permissive
admin policy. The new RPCs therefore run as the trusted database owner only
**after** checking the caller's identity and stored admin flag themselves.
A flagged, verified Google account can use the admin RPCs even if the original
creation app has a narrower Columbia-only policy. This does not grant that
account new direct-table privileges in the original app.

### RPC contract

All pages have a fixed page size of 20. Search terms are limited to 200
characters, treated as literal case-insensitive substrings, and never composed
into dynamic SQL.

| RPC | Result |
| --- | --- |
| `admin_current_profile()` | Only the caller's `id` and boolean role, after Google verification. Returns no other profiles. |
| `admin_profiles(p_page, p_search)` | `{rows, total}` containing profile identity/name/avatar/role fields. |
| `admin_media(p_page, p_search, p_status)` | `{rows, total}` containing known generation columns. |
| `admin_media_item(p_id)` | One generation or `null`. |
| `admin_votes(p_page)` | `{rows, total}` containing individual vote records. |
| `admin_dashboard()` | Real totals, approval counts, unrated records, seven days of UTC activity, status distribution, and most-voted generations. |
| `admin_create_media(p_data)` | Creates a generation owned by the current admin; returns its UUID. |
| `admin_update_media(p_id, p_data)` | Updates supported metadata, preserving creator and creation time; returns its UUID. |
| `admin_delete_media(p_id)` | Deletes one generation; returns its UUID. Its existing foreign key cascades deletion to related votes. |

Each data RPC independently requires a verified Google user plus
`profiles.is_superadmin = true`; the frontend guard is additional protection.
The own-role RPC deliberately does not require the caller to already be an
admin, so it can check the flag without revealing another user's data.

Create/update fields are limited to artist, mood, scene, prompt, title, caption,
model, and status. The server rejects unknown fields, user/creator overrides,
wrong JSON types, unsupported artists/statuses, and oversized values. Limits
match the existing schema: mood/scene 80 characters, prompt 5000, title 90,
caption 900; the admin additionally limits model names to 100. Pending/failed
records can have null generated fields; published records require a nonblank
title, liner note, and model. There is no profile-promotion or vote-editing RPC.

## Configure Google OAuth

Google login is already enabled in the selected original project; its health
and provider-settings checks returned HTTP 200. Preserve its existing OAuth
client and creation-app redirect configuration when adding the admin. If the
owner needs to review or recreate the provider setup, the relevant steps are:

1. In Google Cloud Console, configure the OAuth consent screen and create a
   **Web application** OAuth client. If it is in testing mode, add the intended
   admin as a test user.
2. Register the exact redirect URI
   `https://YOUR_SELECTED_PROJECT_REF.supabase.co/auth/v1/callback`, replacing
   the project reference with the chosen database project.
3. In Supabase **Authentication → Sign In / Providers → Google**, enable
   Google and enter the client ID and client secret securely. Keep Google's
   client secret in Supabase settings; never put it in chat, Git, or a
   `NEXT_PUBLIC_` variable.
4. In Supabase **Authentication → URL Configuration**, preserve the original
   creation app's existing Site URL. Add the approved admin origin's
   `/auth/callback` to the redirect allowlist without removing existing entries.
   Add `http://localhost:3000/auth/callback` for local development as needed.
   `127.0.0.1` is a different origin and needs its own exact callback. Approved
   commit-specific Vercel preview origins also need allowed callback URLs when
   used to test Google login. Avoid a broad allowlist for every Vercel app.
   Prism sends the exact callback URL without query parameters and opens
   `/admin` after sign-in. Supabase matches query strings as part of the redirect
   allowlist; adding a query to an exact callback can fall back to the original
   app's Site URL. Preserve that Site URL and use the exact admin callback.
5. Configure the selected project's matching `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in both the cloud runtime and Vercel.
   These public values are separate from Google's private OAuth secret.

The application starts Google OAuth through Supabase and exchanges the callback
code for a cookie-backed session. There is no anonymous-admin or password-login
fallback. Public profile metadata and email strings never grant the admin role.

## Bootstrap the first superadmin without locking yourself out

The database owner can grant the first role through trusted Supabase dashboard
or SQL Editor access, outside the guarded web application. This is the answer
to the assignment's bootstrap question. There is no public self-promotion route
or first-user-wins rule.

After the migration and bootstrap operations are explicitly approved:

1. Verify the selected project reference in Supabase before executing anything.
2. Apply the reviewed additive migration as the trusted database owner, normally
   `postgres`. Its SECURITY DEFINER functions rely on that owner's legitimate
   ability to read the existing tables across RLS; do not install them as an
   untrusted application role.
3. Sign in once using Google. A non-admin access-denied page is expected at this
   point. Confirm that the original profile-creation process created the Auth
   account's `profiles` row. This migration does not replace that process.
4. Open [`bootstrap-superadmin.sql`](../supabase/bootstrap-superadmin.sql),
   replace the email placeholder in a SQL Editor copy with the exact intended
   Google account, and review it. Keep the committed script placeholder unchanged. Run it through SQL Editor as the trusted owner only after
   approval. It requires exactly one confirmed Auth account with a verified
   Google identity, Google as primary provider, and an existing profile.
5. Sign in again and verify admin access. Verify that a different Google account
   is denied. To revoke access, use trusted database administration to set that
   account's flag back to `false`; protected operations recheck the flag.

The bootstrap script is idempotent for the chosen account. It does not invent
accounts, email-only grants, an application allowlist, or a promotion RPC. The
role-protection trigger also prevents ordinary database client roles from
changing the flag even if unrelated grants are accidentally broadened later.

The strict Google policy rejects accounts initially created with another
provider and later linked to Google. Review an explicit alternative identity
policy before changing that behavior.

## Security properties and verification limits

- Every public data RPC has an independent authorization check. Every definer
  function has an empty fixed search path and uses fully qualified objects.
  Helpers are in a private schema with no client usage/execute grants.
- The authorization helper reads trusted `auth.users` and `auth.identities`,
  requires a confirmed email and verified primary Google identity, and looks
  up `is_superadmin` by the request's `auth.uid()`. It never trusts a caller-
  supplied user ID or browser-editable role metadata.
- Public execute grants are revoked. Only `authenticated` can call the public
  admin RPCs. Invalid requests fail closed before any data query or mutation.
- Original RLS policies, column-level privileges, generation quota enforcement,
  and immutable ballot rules remain in place for the original application.
  Admin creation is an explicitly privileged operation; it does not invoke the
  original AI-generation endpoint or pretend to be an ordinary quota request.
- The reviewed migration passed 28 checks in an isolated PostgreSQL 17 fixture.
  After manual live SQL setup, the own-role RPC exists and rejects anonymous
  execution. This does not verify a real Google-superadmin session or live
  authenticated CRUD/RLS behavior; those remain release checks.
