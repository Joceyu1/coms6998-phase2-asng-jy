# coms6998-phase2-asng-jy

Prism Admin is a standalone COMS6998 Phase 2 administration application built
with Next.js App Router, TypeScript, npm, and Supabase. Its data contract matches
the existing creation/rating app's AI-generated **text liner notes**. It does not
copy that application's interface, music features, or AI-generation code.

## Implemented assignment features

Week 7 adds the following protected administration areas. The implementation and
local checks are complete; its new SQL still needs owner execution before the
Week 7 application release is activated. See [Week 7 setup](docs/week7.md).

| Area | Capability |
| --- | --- |
| Profiles and generated media | Read users and view saved AI-generated text; existing Week 6 media CRUD remains available |
| Prompt chains and steps | Read registered chains, templates, ordering, and model references |
| Prompt chain mix | Read/update relative weights and activation in one atomic save |
| Terms and generation examples | Create/read/update/delete |
| LLM models and providers | Create/read/update/delete metadata, with foreign-key validation |
| Generation requests and LLM responses | Read newly observed creation-service reservations and saved parsed completions |
| Signup domains and whitelisted emails | Create/read/update/delete catalog records; no role promotion or automatic change to the original app's Columbia policy |
| Images | Private avatar/image viewing, upload, metadata editing, replacement, and confirmed deletion |

The dashboard also shows observed request outcomes, recent requests, active
model/provider records, and registered-chain counts. No historical provider
requests, raw responses, token usage, latency, or costs are fabricated.

Week 6 features remain:

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

The selected shared database is the original creation app's Supabase project,
`qrgjqpdvvbwmjpthpmlo`. Week 6 was deployed, and the user confirmed Google/admin
management checks and the original app's saved vote-change fix. The separate
new project `zssjripfhjrptftwddla` is unused. Do not rerun the Week 6 bootstrap or
switch projects while setting up Week 7. See [database setup](docs/database.md).

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

`npm run build` first checks that the combined Week 7 SQL matches its source
migrations; it does not execute SQL. Regenerate after an intentional migration
edit with `node scripts/build-week7-sql.mjs`. `npm start` serves the production
build and requires a successful `npm run build`.
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
The Week 7 SQL was executed against an isolated PostgreSQL 17 fixture containing
the original application and Week 6 admin schema. Its checks cover authorization,
CRUD, mix rollback, image permissions, and atomic setup rollback. Local browser
fixtures exercise the real Next.js pages/actions without adding a production
login bypass. Production Google-session checks remain separate release checks.

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
The Week 7 setup instructions and requirement-to-route mapping are in
[docs/week7.md](docs/week7.md). It uses the existing publishable configuration;
no new service-role or AI provider key is required by the admin application.

## Feedback and submission

The supplied TA feedback deducts points because voters cannot change a vote
after casting it. That correction belongs in the original rating application;
this admin's ratings view remains read-only. See [feedback tracking](docs/feedback.md)
for the released code, database activation, and acceptance checks. The vote-change
code has been deployed, the user confirmed successful SQL execution, and a live
screenshot confirms a successful saved vote change.

The assignment requires immutable deployment URLs for both applications.
See [submission checklist](docs/submission.md). Use the exact READY deployment
and source commit reported for the release; never substitute an invented URL
or assume a stable production alias identifies a specific commit.
