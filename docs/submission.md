# Week 7 submission checklist

Submit the latest successful **commit-specific deployment URL** for each app.
Stable production aliases can change and do not identify a particular commit.

| Application | Verified deployment | Source commit |
| --- | --- | --- |
| Original creation/rating app | https://hello-world-vercel-asng1-2rkl5wr1l-jocelyn13.vercel.app | `54058e335e7145f8384a3e10f44768ca1b4a011a` |
| Week 6 Prism baseline | https://coms6998-phase2-asng-39vxazcos-jocelyn13.vercel.app | `05f6ecf7f332ce362d372636d4baeb9664820dfd` |

Both listed deployments were rechecked as READY through Vercel metadata on
October 28. Both projects have SSO/password/IP deployment protection disabled.
The original app includes the previously released own-vote-change feedback fix.
The Week 7 work does not change the original repository.

**The Week 7 release is staged on a preview branch.** Production remains on the
Week 6 build until owner SQL setup is confirmed. The older admin URL above does
not contain the new pages; use the final READY Week 7 release URL for submission.

Before releasing Week 7:

1. Review the implementation and `supabase/week7-setup.sql`. The owner must run
   the entire approved bundle once on `qrgjqpdvvbwmjpthpmlo`. Management API access
   is still denied; a local test result does not establish live execution.
2. Keep the existing Google provider and superadmin account. Do not rerun Week 6
   SQL or bootstrap. Preserve the original app's Site URL and redirect entries.
3. Finish lint, type checking, application tests, SQL fixture checks, production
   build, anonymous HTTP checks, and local browser workflow checks.
4. The user's earlier GitHub/Vercel approval covers this continued admin update.
   Publish the review branch first. Keep production unchanged until the owner
   confirms the SQL succeeds; pushing `main` triggers a production deployment.
5. Verify the resulting deployment is READY and matches the pushed commit. Add
   its exact `/auth/callback` to the shared project's redirect allowlist.
6. Open that exact URL in Incognito. Confirm Google sign-in, denial for a
   non-superadmin, catalog CRUD, atomic mix editing, and private image CRUD.
7. Make a new generation through the original app and verify its observed
   request and saved completion. Historical data is not fabricated as telemetry.
8. Submit the unchanged creation-app URL and the new admin URL in the course
   portal. No course-portal submission has been sent by Codex.

Vercel deployment protection is already disabled for the new admin project;
password and trusted-IP restrictions are absent. This allows reaching the app's
own login screen and does not remove Google/superadmin authorization.

After deployment, the release's exact immutable URL and commit are reported in
chat and recorded locally in ignored `.vercel/release.json` (metadata only,
without credentials). See `docs/week7.md` for the full route mapping and data
provenance. Week 6 feedback is not graded yet; the supplied 105/100 assessment
contains positive feedback, recorded in `docs/feedback.md` without invented
correction requests or promised Week 7 marks.
