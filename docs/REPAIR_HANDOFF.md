# SD-EVIDENCIA-OPRAVY-2026-10-28

**Purpose:** Safe continuity checkpoint for FiremnáApka / sd-evidencia development.
**Last updated:** 2026-10-28, continuation checkpoint in PR #102.
**Approximate prepared-repairs progress:** 80% (planning estimate; pagination and safe-read guards verified by CI, real integration checks remain); **production-deployed fixes:** 0%. These are planning estimates only, not a release-completion guarantee. Previous checkpoint was 45%.
**Repository:** `Nicolas-Jakubik/stavebna-appka`.
**Production branch:** `main` (baseline commit `8a2d40dfcfcd7d68557db7d2c6f94c6e99e5aa7d`).

## Safety state

- No PR listed below has been merged to `main` as of this checkpoint. Draft PR #102 is **not** authorized for merge or production.
- No production release or production database mutation was authorized or performed during these repairs.
- **Do not merge or deploy before a verified backup and isolated restore test.**
- Preview environments may not have full server credentials. Do not copy production database credentials into untrusted preview builds.

## Work prepared in isolated draft pull requests

- #95 `fix/secure-recorder-api-2026-10-28`: recorder-session enforcement and regression tests.
- #96 `fix/historical-wage-rates-2026-10-28`: historical hourly rates in payroll and finance.
- #97 `fix/safe-admin-deletes-2026-10-28`: restrict deletes to an exact row ID.
- #98 `integration/verified-repairs-2026-10-28`: integration test branch of #95–#97. This document lives here.
- #99 `fix/next-security-update-2026-10-28`: Next.js 16.4.3 / Sharp 0.35.5 with checked-in lockfile; one-time writable CI workflow was removed.
- #100 `chore/safe-db-backup-preparation-2026-10-28`: read-only private backup script and restore runbook. **No actual production backup/restore was made by the script.**
- #101 `fix/finance-pagination-2026-10-28`: paginated all-attendance finance reads and fail-closed display on incomplete data. It targets the integration branch #98, not `main`.
- **#102 `integration/safe-repairs-batch2-2026-10-28`**: new independent DRAFT integration PR to `main`, based on the #101 head, combining #95–#101, patched dependency lockfile, backup-runbook/workflow and this handoff. New regression protection handles rejected page fetches without returning partial finance data. Not deployed.

## CI and checks

- Individual PR checks for #95–#97 and combined #98 succeeded.
- #99 CI passed after lockfile was regenerated.
- #100 backup script syntax and fail-closed-without-credentials checks passed; **real restore remains untested**.
- #101 CI run 40667032448 succeeded: tests, TypeScript and build. Legacy lint issues are non-blocking.
- #102 first integrated CI on commit `1f0c9f922f633a8c222b77b8871d456b81c4646c`: application run **40668438176 passed**; backup script run **40668438145 passed**.
- #102 subsequent commit `6858fb52d504b33662bb999def4452a5f823b633`: catches rejected finance page requests and includes a new regression test. Follow-up application run **40668625265** and final pre-checkpoint run **40668709706** succeeded (tests, TypeScript and build); the backup script run **40668709641** succeeded. Documentation-only changes may start a fresh CI run.
- #102 extra admin mutation hardening in commits `fe071d4` and `6d408c6`: PATCH requires exact row ID; existing uniquely keyed finance row updates and specific historical rename paths remain allowed. DELETE rejects extraneous/broad filters. Initial test fixture used an INSERT array for PATCH and failed; corrected regression fixture passed in application CI **40669929374**.
- #102 payroll pagination commit `b3c76aca24783927143b14d5291b55e4336e9cb4`: both selected half-month and entire month load all attendance pages in stable ID order, with fail-closed rendering and PDF guard on error. Application CI **40670091691 succeeded**, backup script CI **40670091869 succeeded**.
- Supabase metadata was **read only**, from a connected project called `MojaFiremnaApp`; its schema includes a UNIQUE `financie_stavby.zakazka_id`. Its relationship to the currently deployed Vercel application's real environment **has not been proven**; verify before any backup/restore planning.
- #102 dashboard pagination commits `bbd5765c09d4bb9b7b556982cf3650eeca46dd51` and `9bde5dedcc1044a9caf8b03df76465a408d8c831`: full history for conflict checks, selected periods, options, absences and yesterday; UI hides totals/operations when any required dataset is incomplete; consistent row-ID comparison. Application CI [40670935123](https://github.com/Nicolas-Jakubik/stavebna-appka/actions/runs/40670935123) **passed**.
- #102 project and employee list fixes: `3b262280e714345f3d1a68c66f2e0f2cbf7215a2` and `864fd22805ac06fa0a37d0f6ae264c244abdd69e` paginate complete attendance and absence lists and hide misleading partial metrics on failure. Application CI [40671261083](https://github.com/Nicolas-Jakubik/stavebna-appka/actions/runs/40671261083) **passed** (tests, TypeScript and build); backup script CI [40671261027](https://github.com/Nicolas-Jakubik/stavebna-appka/actions/runs/40671261027) **passed**. Neither creates a real database backup.
- Vercel connector listed a project named `sd-evidencia`, but project detail lookup returned 404 and deployments listing returned **403 permission denied**. The connected account cannot reliably verify the currently live deployment or database binding; this remains a release blocker.
- Further audit: recorder's short-range attendance read and other pages can still have default 1,000-row limits; do not claim all paths verified or full 100% safety.
- Package lock verified: Next.js **16.4.3**, Sharp **0.35.5**.
- Vercel preview/status for `sd-evidencia` is **failure** with a build-rate-limit URL. Do not interpret GitHub CI success as successful preview or deployment.
- Legacy lint warnings/errors remain. Lint is currently non-blocking in these PR workflows; tests, TypeScript and build remain mandatory.
- CI passing does NOT verify real mobile/browser workflows or restored production data.

## Work still required

1. Create a genuinely private encrypted backup using a trusted computer and separate DB credentials; restore to isolated database and verify integrity.
2. Test recorder access links and admin roles with representative mobile/desktop browsers.
3. Compare historical pay reports to original records before approving changes.
4. Test finance, payroll, dashboard, project/employee history paging with >1,000 rows on isolated nonproduction data; review remaining recorder reads and other capped queries.
5. **Code reconciliation and CI completed in draft #102** through `864fd228` for the audited admin views. Still perform isolated mobile/browser/integration tests, confirm Vercel access and resolve Preview build-rate-limit. Do not infer production readiness from CI alone.
6. Proposed release/rollback acceptance matrix is prepared in [`docs/SAFE_RELEASE_CHECKLIST.md`](SAFE_RELEASE_CHECKLIST.md). It still requires approval and evidence of backup/restore/browser/data checks before any production change. **Do not claim repairs are live until deployment is confirmed.**

## Resume in a new ChatGPT conversation

Send this exact marker:

`SD-EVIDENCIA-OPRAVY-2026-10-28`

Then say:

"Pokračuj v opravách FiremnáApka. Načítaj prosím GitHub dokument `docs/REPAIR_HANDOFF.md` vo vetve `integration/verified-repairs-2026-10-28` a skontroluj aktuálny stav PR #95 až #101. Produkciu nemeň bez obnoviteľnej zálohy. Píš percentuálny progres."

**Resume from draft PR #102, not from #98 or #101; do not redo their completed changes.** Keep this document and its PR list updated at major milestones.
