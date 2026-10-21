# coms6998-phase2-asng-jy

Prism Admin is a standalone COMS6998 Phase 2 administration application built
with Next.js App Router, TypeScript, npm, and Supabase. Its data contract matches
the existing creation/rating app's AI-generated **text liner notes**. It does not
copy that application's interface, music features, or AI-generation code.

## Implemented assignment features

- Dashboard with real profile/media/vote totals, approval rate, seven days of
  voting activity, publication status distribution, unrated creations, and the
  most engaging notes. Empty states do not invent example statistics.
- Read-only, searchable, paginated community profiles.
- Create/read/update/delete generated-note records, with validation, publication
  requirements, read/detail screens, and explicit destructive confirmation.
- Read-only, paginated individual upvote/downvote history.
- Google OAuth login with session refresh and server-verified identity.
  Every admin route, data read, mutation, and proposed database RPC independently
  checks the persisted `profiles.is_superadmin` role. Ordinary users cannot
  promote themselves through this application.

**Live integration remains pending.** The user selected the original creation
app's Supabase project, `qrgjqpdvvbwmjpthpmlo`. Its public configuration is now
in ignored local settings and the admin Vercel project. The reviewed additive
migration and first-admin bootstrap have not been executed. The selected
project's health and Google-provider checks passed; complete Google login and
authenticated CRUD still need verification. See [database setup and
bootstrap](docs/database.md).

## Local development

Use Node.js 24 LTS and npm 11. If you use nvm, run `nvm use` in this directory.

```sh
npm ci
if [ ! -e .env.local ]; then cp .env.example .env.local; fi
npm run dev
```

Replace the placeholders in `.env.local` with your project's configuration before
using the app. The public login UI, lint, type checks, and production build
work without a live admin session. Existing `.env.local` files should be preserved,
so copy the example only if that file does not already exist.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | The selected database's Supabase URL; confirm the project mismatch in `docs/database.md` first |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | That same project's **publishable** key from Supabase project settings |

Both values are intended to be public and are included in browser bundles. Never
place a Supabase secret key, service-role key, database password, or other private
credential in a `NEXT_PUBLIC_` variable. Keep real environment files out of Git.
The committed `.env.example` contains placeholders only.

In this cloud machine, older injected variables may still refer to the separate
new Supabase project. The saved startup instructions clear those two injected
values when `.env.local` is present, allowing Next.js to use the securely
configured local values for the selected original project. Do not print or
commit `.env.local`. Outside this cloud machine, configure the matching original
project values normally. Cloud networking must permit
`qrgjqpdvvbwmjpthpmlo.supabase.co`; that domain addition is saved for review.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm start` serves the production build and requires a successful `npm run build`.
Next.js generates `next-env.d.ts` and `.next/` locally. npm's lockfile is included;
use `npm ci` to reproduce the installed dependency versions.

With the production server running, use `npm run smoke` in another terminal.
Set `SMOKE_BASE_URL` to check another local port or an approved deployed origin.
It checks login rendering, anonymous route denial (including static-looking
admin paths), no-store responses, forged-session denial, same-origin login/logout,
and callback failure handling. An unavailable Google provider is reported as an
unverified live-auth prerequisite, not a successful Google sign-in. Tests never
create users, write database rows, or invoke media mutations.

The pure security/input tests use Node's built-in runner and TypeScript stripping.
The SQL review files were parsed offline, without executing them. Authenticated
CRUD, role revocation, and RLS still need live verification after the approved
database and Google configuration are available.

### Tooling limitations observed during setup

The current Next.js lint configuration's React, import, and accessibility plugin
peer declarations cap support at ESLint 9. This project pins its latest
maintenance release, 9.39.5, which npm marks deprecated upstream. Next.js 16.4
documents runtime support for ESLint 10, but plugin peer declarations still lag
and cause dependency conflicts. Upgrade the pin when those declarations catch up.

The full dependency audit reports five high-severity entries in the development
lint dependency chain, all stemming from one `braces` stack-exhaustion advisory
([GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)). No
patched `braces` release is currently available. These are development-only
dependencies; `npm audit --omit=dev` reports zero vulnerabilities. Do not apply
the audit tool's suggested downgrade to Next.js 14 lint tooling automatically.

## Authentication and database access

- Client Components can import `createClient` from `@/lib/supabase/browser`.
- Server Components, Server Actions, and Route Handlers can import the async
  `createClient` from `@/lib/supabase/server`. That module is marked `server-only`.
- Configuration is checked when a client is created, so missing variables do not
  prevent the base application from building or rendering.

`src/proxy.ts` refreshes sessions, preserves the SDK's cookie/cache headers, and
checks every `/admin` URL before rendering. `requireSuperadmin()` repeats the
verified Google identity and own-role RPC checks at server data boundaries.
Server Actions authorize again before accepting inputs or calling an RPC.
Authorization uses `auth.getUser()`, never unverified `getSession()` data or
browser-editable role metadata. Protected responses are private and not cached.

The proposed migration exposes only narrowly scoped admin RPCs. Those RPCs check
trusted Google identity and the stored flag before reading or mutating anything,
while preserving the original application's RLS policies and public column
grants. No service-role key is required by the Next.js application.

The answer to the assignment's lockout question is trusted database-owner access:
sign in once with Google, then use Supabase SQL Editor to promote that exact
verified account through the reviewed `supabase/bootstrap-superadmin.sql`.
There is no first-user-wins rule or public promotion endpoint. Execute neither
SQL file without explicit approval.

## Vercel preparation

The new project is configured at
<https://vercel.com/jocelyn13/coms6998-phase2-asng-jy>. It is linked to
`Joceyu1/coms6998-phase2-asng-jy`, with `main` as its production branch.

- Framework: Next.js, with the repository root as the application directory.
- Runtime: Node.js 24.x.
- Install/build commands: `npm ci` and `npm run build`.
- Both Supabase variables are configured as encrypted values for Production,
  Preview, and Development, pointing to the selected original app database.
- The existing browser-safe publishable configuration was reused securely;
  the selected project's health and Google-enabled settings were verified.
- Vercel deployment protection is disabled for this new project, as requested.
  The application-level Google/superadmin login wall remains mandatory.

Vercel detects this application without a `vercel.json`. The local Vercel link
and CLI credentials are under ignored `.vercel/`; never commit that directory.
Cloud environment variables are configured separately from Vercel variables.

The user approved the reviewed SQL, first-account bootstrap, commit, push, and
deployment for this release. The Git integration automatically deploys future
pushes and merges; a push to `main` triggers a production deployment. Public
environment value changes require a new build/deployment because Next.js
includes those values at build time. A successful deployment alone does not
activate administrator access: the approved database migration and verified
Google-account bootstrap must also complete.

Configure the selected Supabase project's allowed redirect URLs for the admin
origin's `/auth/callback`, preserving the creation app's existing configuration.
Prism uses that exact callback without query parameters and opens `/admin` after
sign-in, so an exact allowlist entry works without changing the original Site URL.
Commit-specific preview origins need their matching callback allowed when used
for Google-login testing. See `docs/database.md` for secure OAuth configuration.

## Feedback and submission

Actual prior-week feedback has not been supplied; the original public README
also records no PM feedback session. See [feedback tracking](docs/feedback.md).
No rubric points for feedback implementation are claimed without that input.

The assignment requires immutable deployment URLs for both applications.
See [submission checklist](docs/submission.md). Use the exact READY deployment
and source commit reported for the release; never substitute an invented URL
or assume a stable production alias identifies a specific commit.
