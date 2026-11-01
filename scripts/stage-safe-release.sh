#!/usr/bin/env bash
# SD Evidencia: stage a verified build in the production environment WITHOUT
# changing stavebna-appka.vercel.app. Requires authenticated Vercel CLI on
# the owner's Mac, linked to the existing renamed project.
set -euo pipefail

BRANCH='integration/safe-repairs-batch2-2026-10-28'
PROJECT='prj_OCqs3fyo3eQOqO4tuaI22PlUmWoh'
TEAM='team_J51ayy2Um69GWfW8qecJI3wr'
SCOPE='stavby-domysro'
LIVE_DOMAIN='https://stavebna-appka.vercel.app'
OLD_DEPLOY='dpl_xUKfxLsR8Fao8y1cNffhvPpgibnc'

EXPECTED_SHA="${1:-}"
if [[ ! "$EXPECTED_SHA" =~ ^[0-9a-f]{40}$ ]]; then
  echo "STOP: Pass the exact reviewed 40-character commit SHA as argument." >&2
  exit 2
fi

cd "$(git rev-parse --show-toplevel)"
if [[ "$(git branch --show-current)" != "$BRANCH" ]]; then
  echo "STOP: Wrong Git branch." >&2
  exit 2
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "STOP: Local worktree has uncommitted changes." >&2
  exit 2
fi
if [[ "$(git rev-parse HEAD)" != "$EXPECTED_SHA" ]]; then
  echo "STOP: Local commit differs from reviewed release." >&2
  exit 2
fi
if [[ "$(git rev-parse origin/"$BRANCH")" != "$EXPECTED_SHA" ]]; then
  echo "STOP: Origin branch differs; fetch or review the new changes." >&2
  exit 2
fi
if [[ ! -f .vercel/project.json ]]; then
  echo "STOP: This folder is not linked to Vercel." >&2
  exit 2
fi
node -e '
const fs = require("node:fs");
const p = JSON.parse(fs.readFileSync(".vercel/project.json", "utf8"));
if (p.projectId !== process.argv[1] || p.orgId !== process.argv[2]) {
  console.error("STOP: Wrong Vercel team or project");
  process.exit(2);
}
' "$PROJECT" "$TEAM"

# Previously verified production alias must still point to the stable version.
before="$(vercel inspect "$LIVE_DOMAIN" --scope "$SCOPE" 2>&1)"
if [[ "$before" != *"$OLD_DEPLOY"* ]]; then
  echo "STOP: The live alias has changed since the last verified checkpoint." >&2
  echo "Verify production mapping before any stage or promotion." >&2
  exit 2
fi

echo "STAGE: production environment, no domain promotion. Commit: $EXPECTED_SHA"
vercel deploy --prod --skip-domain --scope "$SCOPE"

after="$(vercel inspect "$LIVE_DOMAIN" --scope "$SCOPE" 2>&1)"
if [[ "$after" != *"$OLD_DEPLOY"* ]]; then
  echo "WARNING: Live alias mapping differs. Stop and inspect Vercel immediately." >&2
  exit 3
fi
echo "OK: new deployment created, original employee-facing URL unchanged."
echo "NEXT: inspect the newly printed staging URL and compare payroll/admin."
