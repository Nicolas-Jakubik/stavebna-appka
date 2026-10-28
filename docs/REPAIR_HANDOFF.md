# SD-EVIDENCIA-OPRAVY-2026-10-28

> **Pokračovanie (28. 10. 2026):** Aktuálny kontrolný návrh je **[draft PR #102](https://github.com/Nicolas-Jakubik/stavebna-appka/pull/102)**, vetva `integration/safe-repairs-batch2-2026-10-28`. Spojil opravy #95–#101 a doplnil ošetrenie odmietnutej stránky databázových údajov. Najnovší odovzdávací dokument je [tu](https://github.com/Nicolas-Jakubik/stavebna-appka/blob/integration/safe-repairs-batch2-2026-10-28/docs/REPAIR_HANDOFF.md). **Pripravené približne 90 % (odhad), nasadené 0 %.** V #102 pribudlo zabezpečenie PATCH/DELETE a stránkovanie Výplat; CI aplikačnej verzie `b3c76aca` úspešné. Dashboard, Stavby, Pracovníci, zapisovateľ a všetky základné zdroje finančných prehľadov už majú stránkovanie a úspešné automatické testy v PR #102. Ďalej overiť reálnu zálohu a izolovanú obnovu, browser/mobilné testy, Vercel oprávnenia a zvyšné čítacie cesty. Nič nemergovať/nasadzovať bez skutočnej obnoviteľnej zálohy a izolovaného testu. Údaje nižšie sú historický checkpoint 45 %, neznamenajú, že sa majú opakovať hotové práce.


**Purpose:** Safe continuity checkpoint for FiremnáApka / sd-evidencia development.
**Last updated:** 2026-10-28.
**Approximate prepared-repairs progress:** 45%; **production-deployed fixes:** 0%. These percentages are estimates, not a release-completion guarantee.
**Repository:** `Nicolas-Jakubik/stavebna-appka`.
**Production branch:** `main` (baseline commit `8a2d40dfcfcd7d68557db7d2c6f94c6e99e5aa7d`).

## Safety state

- No PR listed below has been merged to `main` as of this checkpoint.
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

## CI and checks

- Individual PR checks for #95–#97 and combined #98 succeeded.
- #99 CI passed after lockfile was regenerated.
- #100 backup script syntax and fail-closed-without-credentials checks passed; **real restore remains untested**.
- #101 CI run 40667032448 succeeded: tests, TypeScript and build. Legacy lint issues are non-blocking.
- Legacy lint warnings/errors remain. Lint is currently non-blocking in these PR workflows; tests, TypeScript and build remain mandatory.
- CI passing does NOT verify real mobile/browser workflows or restored production data.

## Work still required

1. Create a genuinely private encrypted backup using a trusted computer and separate DB credentials; restore to isolated database and verify integrity.
2. Test recorder access links and admin roles with representative mobile/desktop browsers.
3. Compare historical pay reports to original records before approving changes.
4. Review paging with >1,000 rows in a nonproduction environment.
5. Reconcile dependency update #99, backup procedures #100 and pagination #101 with the integrated change set; perform final combined tests.
6. Agree on a safe production release plan and a rollback strategy after the above checks. **Do not claim repairs are live until deployment is confirmed.**

## Resume in a new ChatGPT conversation

Send this exact marker:

`SD-EVIDENCIA-OPRAVY-2026-10-28`

Then say:

"Pokračuj v opravách FiremnáApka. Načítaj prosím GitHub dokument `docs/REPAIR_HANDOFF.md` vo vetve `integration/verified-repairs-2026-10-28` a skontroluj aktuálny stav PR #95 až #101. Produkciu nemeň bez obnoviteľnej zálohy. Píš percentuálny progres."

**Keep this document and its PR list updated at major milestones.**


**Neskorší checkpoint 28.10.2026 (PR #102):** V pripojenom Supabase projekte `MojaFiremnaApp` boli iba čítaním overené RPC `record_attendance_secure(jsonb)`, jej oprávnenia (service_role áno, anon/authenticated nie), RLS na kľúčových tabuľkách, duplicitné overlap triggery a drift historických SQL migrácií. Zálohovací skript v #102 teraz povinne šifruje cez `age`; test s fiktívnym dumpom prešiel. Skutočná záloha a obnova, potvrdenie produkčného Vercelu a izolované browser/mzdové testy stále chýbajú. **90 % pripravené (odhad), 0 % produkčne nasadené.** Pozri `docs/REPAIR_HANDOFF.md`, `docs/SAFE_RELEASE_CHECKLIST.md` a `docs/DB_READONLY_AUDIT_2026-10-28.md` **v integračnej vetve #102**. Nepokračovať zo starej #98 bez tohto checkpointu.
