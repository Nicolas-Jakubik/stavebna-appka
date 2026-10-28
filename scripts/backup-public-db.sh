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
: "${BACKUP_AGE_RECIPIENT:?Set BACKUP_AGE_RECIPIENT to a public age recipient; private identity must be kept offline}"
: "${BACKUP_AGE_IDENTITY:?Set BACKUP_AGE_IDENTITY to a local private age identity for mandatory archive verification}"

if [[ ! -r "$BACKUP_AGE_IDENTITY" || ! -f "$BACKUP_AGE_IDENTITY" ]]; then
  printf 'Missing or unreadable age identity; refusing an unverified backup.\n' >&2
  exit 2
fi

export PGSSLMODE="${PGSSLMODE:-require}"
case "$PGSSLMODE" in
  require|verify-ca|verify-full) ;;
  *)
    printf 'Refusing insecure database TLS mode. Use require, verify-ca or verify-full.\n' >&2
    exit 2
    ;;
esac

for command_name in pg_dump pg_restore age; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing required PostgreSQL command: %s\n' "$command_name" >&2
    exit 2
  fi
done

mkdir -p -- "$BACKUP_DIR"
target_directory="$(cd "$BACKUP_DIR" && pwd -P)"
source_directory="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -n "$source_directory" ]]; then
  case "$target_directory/" in
    "$source_directory/"*)
      printf 'Refusing to place a sensitive backup inside the Git repository.\\n' >&2
      exit 2
      ;;
  esac
fi

timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"
target="$target_directory/firemnaappka-public-$timestamp.dump.age"
if [[ -e "$target" ]]; then
  printf 'A backup already exists at the destination; refusing to overwrite it.\n' >&2
  exit 2
fi

temporary="$(mktemp "$target_directory/.firemnaappka-encrypted.XXXXXXXX")"
manifest="$(mktemp "$target_directory/.firemnaappka-manifest.XXXXXXXX")"
cleanup() { rm -f -- "$temporary" "$manifest"; }
trap cleanup EXIT

# pg_dump streams directly into age encryption. No plaintext dump is written.
# No production mutations. The recipient is public; private keys stay offline.
pg_dump --no-password --format=custom --no-owner --no-acl --schema=public \
  | age --encrypt --recipient "$BACKUP_AGE_RECIPIENT" > "$temporary"
if [[ ! -s "$temporary" ]]; then
  printf 'Encrypted backup is empty.\n' >&2
  exit 1
fi

# Mandatory encrypted archive inspection without writing plaintext to disk.
# This only validates archive structure; it is NOT a real isolated restore test.
age --decrypt --identity "$BACKUP_AGE_IDENTITY" "$temporary" \
  | pg_restore --list - > "$manifest"
if ! grep -Eq 'TABLE DATA[[:space:]]+public[[:space:]]+dochadzka' "$manifest"; then
  printf 'The decrypted archive lacks public.dochadzka table data.\n' >&2
  exit 1
fi

mv -- "$temporary" "$target"
chmod 600 "$target"
printf 'Encrypted private backup archive created: %s\n' "$target"
if command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$target"
elif command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$target"
fi
printf '%s\n' 'IMPORTANT: A full restore test in an isolated PostgreSQL 17 database is still required.'
printf '%s\n' 'IMPORTANT: This backs up only the public schema, not Supabase Auth or Storage.'
