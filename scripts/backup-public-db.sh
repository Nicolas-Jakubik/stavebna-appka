#!/usr/bin/env bash
# Read-only backup of the public schema. Never stores secrets or backups in Git.
set -Eeuo pipefail
umask 077

: "${PGHOST:?Set PGHOST to your Supabase direct or session-pooler host}"
: "${PGPORT:?Set PGPORT (typically 5432 for a direct/session connection)}"
: "${PGUSER:?Set PGUSER}"
: "${PGDATABASE:?Set PGDATABASE}"
: "${PGPASSWORD:?Set PGPASSWORD locally; never paste it into chat or source control}"
: "${BACKUP_DIR:?Set BACKUP_DIR to a private location OUTSIDE the Git repository}"

export PGSSLMODE="${PGSSLMODE:-require}"

for command_name in pg_dump pg_restore; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing required PostgreSQL command: %s\n' "$command_name" >&2
    exit 2
  fi
done

mkdir -p -- "$BACKUP_DIR"
target_directory="$(cd "$BACKUP_DIR" && pwd -P)"
source_directory="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -n "$source_directory" && ("$target_directory" == "$source_directory" || "$target_directory" == "$source_directory/"*) ]]; then
  printf 'Refusing to place a sensitive backup inside the Git repository.\n' >&2
  exit 2
fi

timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
target="$target_directory/firemnaappka-public-$timestamp.dump"
if [[ -e "$target" ]]; then
  printf 'A backup already exists at the destination; refusing to overwrite it.\n' >&2
  exit 2
fi

temporary="$(mktemp "$target_directory/.firemnaappka-backup.XXXXXXXX")"
manifest="$(mktemp "$target_directory/.firemnaappka-manifest.XXXXXXXX")"
cleanup() { rm -f -- "$temporary" "$manifest"; }
trap cleanup EXIT

# No production changes. Credentials are read from PG* environment variables,
# never passed in command-line arguments or written to the backup manifest.
pg_dump --no-password --format=custom --no-owner --no-acl --schema=public --file="$temporary"
pg_restore --list "$temporary" > "$manifest"

if ! grep -Eq 'TABLE DATA[[:space:]]+public[[:space:]]+dochadzka' "$manifest"; then
  printf 'The archive does not contain the required public.dochadzka table data.\n' >&2
  exit 1
fi

mv -- "$temporary" "$target"
chmod 600 "$target"
printf 'Private backup archive created: %s\n' "$target"
if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$target"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$target"
fi
printf '%s\n' 'IMPORTANT: Archive listing was validated, but a full restore test was NOT performed.'
printf '%s\n' 'IMPORTANT: This backs up only the public schema, not Supabase Auth or Storage.'
