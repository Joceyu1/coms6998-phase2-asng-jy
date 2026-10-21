# Phase 2 submission checklist

Submit the latest successful **commit-specific deployment URL** for each app.
Stable production aliases can change and do not identify a particular commit.

| Application | Verified deployment | Source commit |
| --- | --- | --- |
| Original creation/rating app | https://hello-world-vercel-asng1-gmax39zzt-jocelyn13.vercel.app | `65a1b1c15702e7f92988a07f8917482ce053f0a5` |
| New Prism admin | Use the latest READY deployment from [the admin project](https://vercel.com/jocelyn13/coms6998-phase2-asng-jy) | Verify its GitHub commit matches the approved release |

The original app's READY production deployment and linked GitHub repository were
verified through read-only Vercel metadata. Its immutable URL returned HTTP 200
and SIDE B content without sending login cookies. Both projects have Vercel
SSO/password/IP deployment protection disabled. No original repository,
application settings, or deployment was changed.

Before deploying the admin:

The user has approved this release's reviewed SQL, exact-account bootstrap,
commit, push, and deployment. That approval does not imply those operations have
completed. Database setup still requires the saved Supabase management token.

1. Confirm the intended shared Supabase database and matching public key.
2. Approve and apply the additive admin migration through trusted database access.
3. Configure Google OAuth and the exact deployed callback origins, preserving
   the original app's existing Auth settings.
4. Bootstrap one verified Google account through the reviewed owner-only SQL.
5. Verify admin CRUD and stats, ordinary-user denial, and role revocation.
6. Approve the GitHub push/deployment. Pushing `main` now triggers Vercel's Git
   integration, so do not push merely as a backup without deployment approval.
7. Record the resulting READY deployment's immutable URL and exact commit here.
8. Open a fresh Incognito session: the admin must show the Google login wall.
   A non-superadmin Google account must still be denied after signing in.

Vercel deployment protection is already disabled for the new admin project;
password and trusted-IP restrictions are absent. This allows reaching the app's
own login screen and does not remove Google/superadmin authorization.

No submission has been sent to the course portal from this session.

After deployment, the release's exact immutable URL and commit are reported in
chat and recorded locally in ignored `.vercel/release.json` (metadata only,
without credentials). The admin remains locked until its migration/bootstrap
and callback configuration complete; do not submit it as fully functional before
live Google-superadmin CRUD verification.
