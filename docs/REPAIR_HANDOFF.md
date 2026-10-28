# SD-EVIDENCIA-OPRAVY-2026-10-28

**Purpose:** Safe continuity checkpoint for FiremnáApka / sd-evidencia development.
**Last updated:** 2026-10-28, continuation checkpoint in PR #102.
**Approximate prepared-repairs progress:** 55% (provisional, latest commit tests pending); **production-deployed fixes:** 0%. These are planning estimates only, not a release-completion guarantee. Previous checkpoint was 45%.
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
- #102 subsequent commit `6858fb52d504b33662bb999def4452a5f823b633`: catches rejected finance page requests and includes a new regression test. CI must be confirmed for the most recent head after this handoff update, not assumed from the first successful run.
- Package lock verified: Next.js **16.4.3**, Sharp **0.35.5**.
- Vercel preview/status for `sd-evidencia` is **failure** with a build-rate-limit URL. Do not interpret GitHub CI success as successful preview or deployment.
- Legacy lint warnings/errors remain. Lint is currently non-blocking in these PR workflows; tests, TypeScript and build remain mandatory.
- CI passing does NOT verify real mobile/browser workflows or restored production data.

## Work still required

1. Create a genuinely private encrypted backup using a trusted computer and separate DB credentials; restore to isolated database and verify integrity.
2. Test recorder access links and admin roles with representative mobile/desktop browsers.
3. Compare historical pay reports to original records before approving changes.
4. Review paging with >1,000 rows in a nonproduction environment.
5. **Code reconciliation completed in draft #102**, but confirm final CI for latest HEAD and do isolated mobile/browser/integration tests; review Vercel preview build-rate-limit.
6. Agree on a safe production release plan and a rollback strategy after the above checks. **Do not claim repairs are live until deployment is confirmed.**

## Resume in a new ChatGPT conversation

Send this exact marker:

`SD-EVIDENCIA-OPRAVY-2026-10-28`

Then say:

"Pokračuj v opravách FiremnáApka. Načítaj prosím GitHub dokument `docs/REPAIR_HANDOFF.md` vo vetve `integration/verified-repairs-2026-10-28` a skontroluj aktuálny stav PR #95 až #101. Produkciu nemeň bez obnoviteľnej zálohy. Píš percentuálny progres."

**Resume from draft PR #102, not from #98 or #101; do not redo their completed changes.** Keep this document and its PR list updated at major milestones.
