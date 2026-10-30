#!/usr/bin/env bash
# All invocations use a fake checkout + fake git/vercel, no real deployment.
set -Eeuo pipefail

scratch="$(mktemp -d)"
trap 'rm -rf -- "$scratch"' EXIT
mkdir -p "$scratch/repo/scripts" "$scratch/repo/.vercel" "$scratch/bin"
cp -- scripts/stage-backend-match-without-alias.sh "$scratch/repo/scripts/"
printf '%s\n' '{"projectId":"prj_OCqs3fyo3eQOqO4tuaI22PlUmWoh","orgId":"team_J51ayy2Um69GWfW8qecJI3wr"}' > "$scratch/repo/.vercel/project.json"

export FAKE_ROOT="$scratch/repo"
export FAKE_SHA='0123456789abcdef0123456789abcdef01234567'
export FAKE_DEPLOY_LOG="$scratch/deploy.log"
export FAKE_HAS_SKIP_DOMAIN=1

cat > "$scratch/bin/git" <<'FAKE_GIT'
#!/usr/bin/env bash
case "$*" in
  'branch --show-current') echo 'diagnostic/read-only-production-backend-match-2026-10-29' ;;
  'rev-parse HEAD') echo "$FAKE_SHA" ;;
  'status --porcelain') : ;;
  'rev-parse --show-toplevel') echo "$FAKE_ROOT" ;;
  *) echo "Unexpected fake git command: $*" >&2; exit 19 ;;
esac
FAKE_GIT

cat > "$scratch/bin/vercel" <<'FAKE_VERCEL'
#!/usr/bin/env bash
if [[ "$*" == 'deploy --help' ]]; then
  [[ "${FAKE_HAS_SKIP_DOMAIN:-0}" != 1 ]] ||
    printf '  --skip-domain          Disable automatic production aliasing\n'
  # Long output makes the old grep -q/pipefail SIGPIPE bug reproducible.
  for ((i=0;i<10000;i++)); do
    printf 'Unrelated Vercel deployment help line %05d\n' "$i"
  done
  exit "${FAKE_HELP_EXIT:-0}"
fi
if [[ "$*" == 'deploy --prod --skip-domain --yes --scope stavby-domysro' ]]; then
  printf '%s\n' "$*" >> "$FAKE_DEPLOY_LOG"
  printf 'https://fake-staged-example.vercel.app\n'
  exit 0
fi
printf 'Unexpected fake Vercel command: %s\n' "$*" >&2
exit 24
FAKE_VERCEL

chmod +x "$scratch/bin/git" "$scratch/bin/vercel"
export PATH="$scratch/bin:$PATH"

# Actual Vercel CLI 54.14.2 prints valid help and exits 2.
# The probe against real CLI in CI independently establishes this behavior.
export FAKE_HELP_EXIT=2

# Positive regression: must accept the advertised flag in long help output.
SD_DIAGNOSTIC_STAGED_ONLY=APPROVED_NO_DOMAIN \
  bash "$scratch/repo/scripts/stage-backend-match-without-alias.sh" "$FAKE_SHA" \
  > "$scratch/positive.log" 2>&1
[[ -f "$FAKE_DEPLOY_LOG" ]] || { echo 'Regression: fake staged invocation never reached' >&2; exit 1; }
[[ "$(wc -l < "$FAKE_DEPLOY_LOG")" -eq 1 ]] || exit 1
grep -Fq -- 'deploy --prod --skip-domain --yes --scope stavby-domysro' "$FAKE_DEPLOY_LOG"

# Negative: if flag is not advertised, refuse before attempting deployment.
: > "$FAKE_DEPLOY_LOG"
export FAKE_HAS_SKIP_DOMAIN=0
if SD_DIAGNOSTIC_STAGED_ONLY=APPROVED_NO_DOMAIN \
  bash "$scratch/repo/scripts/stage-backend-match-without-alias.sh" "$FAKE_SHA" \
  > "$scratch/missing-flag.log" 2>&1; then
  echo 'ERROR: unsupported skip-domain was accepted' >&2
  exit 1
fi
grep -Fq -- 'does not advertise --skip-domain' "$scratch/missing-flag.log"
[[ ! -s "$FAKE_DEPLOY_LOG" ]] || { echo 'ERROR: attempted deployment without skip-domain' >&2; exit 1; }

# Negative: unexpected failure status (7) must never deploy even if flag is printed.
export FAKE_HAS_SKIP_DOMAIN=1 FAKE_HELP_EXIT=7
if SD_DIAGNOSTIC_STAGED_ONLY=APPROVED_NO_DOMAIN \
  bash "$scratch/repo/scripts/stage-backend-match-without-alias.sh" "$FAKE_SHA" \
  > "$scratch/failing-help.log" 2>&1; then
  echo 'ERROR: failed CLI help was accepted' >&2
  exit 1
fi
grep -Fq -- 'CLI deploy help failed unexpectedly' "$scratch/failing-help.log"
[[ ! -s "$FAKE_DEPLOY_LOG" ]] || { echo 'ERROR: attempted deployment after help failure' >&2; exit 1; }

echo 'Synthetic staging runner regression passed: status 2 help accepted, missing flag and unexpected help failure refused.'
