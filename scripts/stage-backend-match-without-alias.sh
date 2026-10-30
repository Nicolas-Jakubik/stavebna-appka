#!/usr/bin/env bash
# Manual, explicitly approved ONLY: one staged Production-environment diagnostic
# WITHOUT assigning any Production domain/alias. Do not run in CI/Preview.
set -Eeuo pipefail

EXPECTED_PROJECT='prj_OCqs3fyo3eQOqO4tuaI22PlUmWoh'
EXPECTED_ORG='team_J51ayy2Um69GWfW8qecJI3wr'
EXPECTED_BRANCH='diagnostic/read-only-production-backend-match-2026-10-29'
EXPECTED_SHA="${1:-}"

deny() { printf 'STOP: %s\n' "$*" >&2; exit 2; }
[[ "$#" -eq 1 && "$EXPECTED_SHA" =~ ^[a-f0-9]{40}$ ]] || deny 'Provide the exact 40-character approved Git commit SHA.'
[[ "${SD_DIAGNOSTIC_STAGED_ONLY:-}" == 'APPROVED_NO_DOMAIN' ]] || deny 'Explicit local staging opt-in missing. Set SD_DIAGNOSTIC_STAGED_ONLY=APPROVED_NO_DOMAIN.'

for binary in git node vercel; do command -v "$binary" >/dev/null 2>&1 || deny "Required command unavailable: $binary"; done
[[ "$(git branch --show-current)" == "$EXPECTED_BRANCH" ]] || deny "Wrong Git branch (expected $EXPECTED_BRANCH)."
[[ "$(git rev-parse HEAD)" == "$EXPECTED_SHA" ]] || deny 'Git HEAD does not equal the approved SHA.'
[[ -z "$(git status --porcelain)" ]] || deny 'Working tree is not clean; refusing to deploy unreviewed files.'

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(git rev-parse --show-toplevel)"
[[ "$script_dir" == "$repo_root/scripts" ]] || deny 'Script must be executed from its own trusted Git checkout.'
cd -- "$repo_root"

[[ -r .vercel/project.json ]] || deny 'No linked local Vercel project. Link to sd-evidencia in your own authenticated CLI first.'
node -e '
const p=require("./.vercel/project.json");
if(p.projectId !== process.argv[1] || p.orgId !== process.argv[2]){
  process.stderr.write("STOP: Local Vercel link is not the expected project/team.\\n");
  process.exit(2);
}' "$EXPECTED_PROJECT" "$EXPECTED_ORG" || exit 2

# Only the official CLI has a documented skip-domain guarantee. The Vercel
# connected deployment API currently exposes no equivalent safety parameter.
if ! vercel deploy --help 2>&1 | grep -Fq -- '--skip-domain'; then
  deny 'Installed Vercel CLI does not advertise --skip-domain; deployment not attempted.'
fi

printf '%s\n' 'Target: sd-evidencia in the existing Vercel team.'
printf '%s\n' 'Mode: Production env on an UNALIASED staged deployment only.'
printf '%s\n' 'The existing live domain must remain on its current deployment.'
printf '%s\n' 'No vercel promote, no merge, no production migration will be executed.'
# The deployment URL will be shown in the local console. The user must log in
# privately on that protected SAME host before opening /api/admin/backend-match.
vercel deploy --prod --skip-domain --yes --scope stavby-domysro

printf '%s\n' 'Staged deployment requested. STOP: do not promote this deployment.'
printf '%s\n' 'Independently check that the live production domain still targets the prior deployment.'
