# Week 7: Admin Panel with More Observability

This update extends the current Prism application and the original shared
Supabase project `qrgjqpdvvbwmjpthpmlo`. The user confirmed there is no supplied
course schema, so the new entities are additive. The previous creation/rating
repository is unchanged by this assignment.

## Requirement mapping

| Requirement | Admin route | Access |
| --- | --- | --- |
| Read users/profiles | `/admin/profiles` | Read |
| Read prompt chains | `/admin/prompt-chains` | Read/detail; ordered steps on chain detail |
| Read prompt chain steps | `/admin/prompt-chain-steps` | Read/detail; filter by chain |
| Read/update prompt chain mix | `/admin/prompt-chain-mix` | Atomic allocation editor |
| Terms | `/admin/terms` | Create/read/update/delete |
| View AI-generated media | `/admin/media` | Read/detail; Week 6 CRUD retained |
| Generation requests | `/admin/generation-requests` | Read/detail |
| AI generation examples | `/admin/generation-examples` | Create/read/update/delete |
| LLM models | `/admin/llm-models` | Create/read/update/delete |
| LLM providers | `/admin/llm-providers` | Create/read/update/delete |
| LLM responses | `/admin/llm-responses` | Read/detail |
| Allowed signup domains | `/admin/allowed-signup-domains` | Create/read/update/delete |
| Whitelisted email addresses | `/admin/whitelisted-emails` | Create/read/update/delete |
| Images, including upload | `/admin/images` | Create/read/update/delete; private previews |

Images apply because the existing creation app supports uploaded profile
avatars. Generated content is currently text; this update does not invent an
AI-image generation pipeline.

## Apply the database extension once

The existing database must already contain the Week 6 admin layer and original
application schema. Do not apply this to the unused new Supabase project.

1. Review `supabase/migrations/202610280001_week7.sql` and
   `supabase/migrations/202610280002_admin_images.sql`.
2. After authorization, open the original project's SQL Editor as `postgres`.
   Copy the **complete** `supabase/week7-setup.sql`, including its initial
   `begin;` and final `commit;`, into a new query and run it once. This generated
   file combines both migrations in one transaction. Do not also run the two
   individual migrations after applying the bundle.
3. A successful setup returns no rows. If a guard reports existing Week 7
   objects, stop and inspect them; the installer deliberately refuses to
   overwrite unknown schemas or policies. A failure rolls back both stages.
4. Deploy the application update using the existing Supabase URL and matching
   publishable key. No service-role key belongs in the admin app.
5. Sign in with the existing verified Google superadmin. Check each catalog,
   update a mix allocation, and test a new image's upload, metadata edit,
   replacement, and deletion. Confirm a non-superadmin Google account is denied.
6. Use the original creation app with an eligible Columbia Google account to
   make a new generation. Confirm its request and saved completion appear in
   Prism; do not confuse a manually added media record with a provider request.

The saved management token currently returns HTTP 403 for this project. Owner
SQL Editor access is the available live setup path; the local fixture tests do
not imply that this production SQL has already run.

Check bundle freshness with `npm run db:check`. Regenerate intentionally with
`node scripts/build-week7-sql.mjs` after changing either migration. Production
builds perform the freshness check without connecting to a database.

## Data meaning and boundaries

- **Requests and responses:** a database observer records new reservations and
  terminal writes performed by the creation service's trusted `service_role`.
  Saved completions contain the title/caption the existing app actually
  persisted. Raw HTTP payloads, token usage, model latency, costs, and historical
  manual-record provenance are unavailable and are not invented or backfilled.
- **Prompt chains:** the initial chain/step is a clearly marked snapshot of the
  creation app's existing prompt. Chain-mix weights are relative configuration
  values from 0 to 1000, with at least one active positive allocation. Changing
  this catalog does not rewrite the existing app's code-defined prompt routing.
- **Providers/models:** the known code-default Gemini configuration is
  registered. Arbitrary historical media model strings are not attributed to
  Google. Provider records contain metadata, not private API credentials.
- **Signup catalogs:** domain/email records can be managed in the admin. They
  do not automatically replace the original application's Columbia Google
  checks and never grant `is_superadmin`. Wiring a different signup policy is a
  separate application/authentication change.
- **Images:** the existing `avatars` bucket remains private and limited to
  JPG/PNG/WebP up to 2 MiB. Uploads also validate signatures and dimensions.
  Preview URLs expire after five minutes. Storage API operations use the user's
  session and database policies, not a service-role key. The new admin exception
  is limited to verified Google superadmins and this bucket; ordinary users'
  existing avatar restrictions and other buckets remain unchanged. Deleting an
  image clears matching profile references.

## Security and release checks

Every route remains under the existing `/admin/:path*` proxy and admin layout.
Every data helper and Server Action authorizes again; each RPC independently
checks trusted Google identity and the persisted superadmin flag. Writable
resources, fields, relationships, and operations are whitelisted. Read-only
resources reject forged mutations. Referenced records are protected against
deletion, and mix updates commit together or not at all.

Before submission, confirm both Vercel projects have deployment protection off,
open the exact commit-specific URLs in Incognito, and allow each exact
`/auth/callback` in the original Supabase project's redirect list. Preserve its
existing Site URL and redirect entries. Record the new READY admin deployment
and exact GitHub commit; do not submit the previous Week 6 URL as a Week 7 build.

Week 6 feedback has not been graded as of October 28. The user supplied a
105/100 assessment of another graded submission; it reports full marks and
positive comments rather than new correction requests. See `docs/feedback.md`.
