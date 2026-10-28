# Prior-assignment feedback

## Week 7 feedback status

On October 28, 2026, the user confirmed that Week 6 has not been graded yet.
There are no Week 6 TA correction requests to invent or mark as implemented.
The latest supplied graded submission scored **105/100**, with these comments:

| Criterion | Points | Assessment |
| --- | --- | --- |
| End-to-end workflow | 15 / 15 | Core workflow works without blocking bugs. |
| Supabase integration | 10 / 10 | Reads and database mutations work. |
| Authentication and route protection | 10 / 10 | Login/logout and gated routes work. |
| Voting/data mutation | 10 / 10 | Ratings persist and respect login state. |
| Deployment readiness | 5 / 5 | Public Vercel app loads reliably. |
| Visual design | 25 / 25 | Clean, readable layout and spacing. |
| Usability | 25 / 25 | Clear affordances and navigation. |
| Creative/polished work bonus | 5 / 5 | Exceptional-quality bonus awarded. |

Week 7 preserves those behaviors while extending the protected admin area.
Local regression checks cover the original roles, ratings schema, generation
quotas, and ordinary avatar permissions alongside the new features. The Prism
layout is retained with grouped, scrollable navigation and mobile forms.
The earlier vote-change correction below remains part of the verified history.
These records are evidence of supplied feedback, not a prediction of Week 7
rubric points.

## Earlier vote-change correction

The user supplied the TA's grading screenshot on October 21, 2026. It records:

| Criterion | Points | Feedback |
| --- | --- | --- |
| Gated Route | 25 / 25 | Public and authenticated routes satisfied the criterion. |
| Data Mutability | 12.5 / 25 | "No way to change the vote after it is cast." |
| Following Feedback | 50 / 50 | Full marks recorded; no additional criticism shown. |

The requested correction was for a signed-in voter to change their own existing
upvote or downvote in the original SIDE B rating application. Its old implementation
treated ballots as immutable. The admin application's read-only ratings
view does not satisfy this feedback by itself, and giving admins control over
other users' ballots would address a different requirement.

## Implementation status

The user explicitly authorized the original-repository change and its reviewed
vote-change SQL. The seven-file fix was committed and pushed to
`Joceyu1/hello-world-vercel-asng1-jy` as
`54058e335e7145f8384a3e10f44768ca1b4a011a`. Vercel marks its
[commit-specific deployment](https://hello-world-vercel-asng1-2rkl5wr1l-jocelyn13.vercel.app)
READY and promoted it to production. A fresh public HTML/JavaScript check confirms
that only the selected vote button is disabled; the opposite vote is available.

The user ran the complete vote-change SQL through the original project's SQL
Editor and confirmed its successful "no rows returned" result. This manual path
was necessary because the management token still returns HTTP 403. The new
deployment also needs its exact `/auth/callback` in the existing Auth redirect
allowlist. The user subsequently supplied a live screenshot showing the saved
selection and "Vote updated. You can change it again." This confirms the
server-action update path succeeded against the live database.

Review artifacts and validation evidence remain in this checkout's ignored
`.npm-cache/feedback-review/` directory. The original app's Google/domain checks
and this admin area's Google/superadmin wall remain in place.

The proposed database change passed 27 checks in an isolated PostgreSQL 17
fixture using the original migrations together with the admin migration. These
checks include own-vote changes in both directions, concurrent first votes,
unchanged ballot identity fields, aggregate updates, unauthorized-access denial,
and continued admin RPC operation. No cloud database was changed by these tests.

Both the isolated proposal and the actual original-repository checkout passed
their locked dependency installation, all 78 application/database tests, ESLint,
and production builds with TypeScript checking. Original package declarations
and the lockfile remain unchanged. The separate live screenshot confirms a
successful saved vote change; a full-page-refresh result is not independently
captured in that screenshot.

## Acceptance checks

1. An eligible signed-in user can cast a vote, switch upvote to downvote, and
   switch downvote to upvote on a published generation.
2. Refreshing preserves the changed vote; the vote's identity, owner, generation,
   and creation time remain unchanged, and no duplicate ballot is created.
3. Displayed counts and the admin's read-only vote/statistics views reflect the
   saved vote. Repeating the same value does not create another record.
4. Anonymous/ineligible users cannot vote; a voter cannot change another user's
   ballot or vote on an unpublished generation through the update path.
5. After approval and deployment, record the actual passing checks and latest
   commit-specific rating-app URL. Do not substitute a proposed patch or local
   fixture result for live browser verification.
