#!/usr/bin/env bash
# CI only: never connects to Supabase and never loads actual employee data.
# An isolated Docker PostgreSQL 17 instance is used for source and restore.
set -Eeuo pipefail
umask 077

scratch="$(mktemp -d)"
container="synthetic-restore-$RANDOM-$RANDOM"
cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  rm -rf -- "$scratch"
}
trap cleanup EXIT
mkdir -p "$scratch/tls" "$scratch/bin" "$scratch/backups"
chmod 755 "$scratch" "$scratch/tls"

# Self-signed certificate is generated only for ephemeral CI PostgreSQL.
# Production credentials, certificates and endpoints are never used here.
openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
  -subj '/CN=localhost' -addext 'subjectAltName=DNS:localhost,IP:127.0.0.1' \
  -keyout "$scratch/tls/server.key" -out "$scratch/tls/server.crt" >/dev/null 2>&1
chmod 600 "$scratch/tls/server.key"
sudo chown 999:999 "$scratch/tls/server.key"
chmod 644 "$scratch/tls/server.crt"

docker run -d --name "$container" \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=synthetic-test-only-password \
  -e POSTGRES_DB=synthetic_source \
  -p 127.0.0.1:55432:5432 \
  -v "$scratch/tls:/ci-tls:ro" \
  postgres:17 -c ssl=on -c ssl_cert_file=/ci-tls/server.crt \
  -c ssl_key_file=/ci-tls/server.key >/dev/null

ready=0
for attempt in $(seq 1 45); do
  if docker exec "$container" pg_isready -U postgres -d synthetic_source >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then
  docker logs "$container" >&2
  printf 'Synthetic PostgreSQL 17 did not become ready.\n' >&2
  exit 1
fi

docker exec -i "$container" psql -X -v ON_ERROR_STOP=1 -U postgres -d synthetic_source <<'SYNTHETIC_SQL'
CREATE TABLE public.zamestnanci (
  id bigint PRIMARY KEY, meno text NOT NULL UNIQUE, sadzba numeric(12,2)
);
CREATE TABLE public.zoznam_zakaziek (
  id bigint PRIMARY KEY, nazov text NOT NULL
);
CREATE TABLE public.objekty_stavby (
  id bigint PRIMARY KEY, zakazka_id bigint NOT NULL
    REFERENCES public.zoznam_zakaziek(id), nazov text NOT NULL
);
CREATE TABLE public.dochadzka (
  id bigint PRIMARY KEY, meno text NOT NULL, datum date NOT NULL,
  zakazka text NOT NULL, objekt_id bigint REFERENCES public.objekty_stavby(id),
  prichod time NOT NULL, odchod time NOT NULL, sadzba_snapshot numeric(12,2)
);
CREATE TABLE public.nepritomnosti (
  id bigint PRIMARY KEY, meno text NOT NULL, datum date NOT NULL, dovod text
);
INSERT INTO public.zamestnanci VALUES
  (1,'Synthetic Worker One',12.50),(2,'Synthetic Worker Two',15.00);
INSERT INTO public.zoznam_zakaziek VALUES
  (1,'Synthetic House A'),(2,'Synthetic House B');
INSERT INTO public.objekty_stavby VALUES
  (101,1,'Synthetic Object A1'),(202,2,'Synthetic Object B1');
INSERT INTO public.dochadzka VALUES
  (1,'Synthetic Worker One','2026-10-01','Synthetic House A',101,'07:00','19:00',10.00),
  (2,'Synthetic Worker Two','2026-10-01','Synthetic House B',202,'07:00','18:00',NULL),
  (3,'Synthetic Worker One','2026-10-02','Synthetic House B',202,'07:00','18:00',12.50);
INSERT INTO public.nepritomnosti VALUES
  (1,'Synthetic Worker Two','2026-10-02','Synthetic only');
SYNTHETIC_SQL

# The actual production backup script is exercised unchanged.
# PG17 client tools run in a separate official PostgreSQL 17 container.
# The connections themselves use verify-full TLS and a test-only CA.
cat > "$scratch/bin/pg17-client" <<'PG17_WRAPPER'
#!/usr/bin/env bash
set -Eeuo pipefail
exec docker run --rm -i --network host \
  -e PGHOST -e PGPORT -e PGUSER -e PGDATABASE -e PGPASSWORD \
  -e PGSSLMODE -e PGSSLROOTCERT=/ci-ca.crt \
  -v "$CI_CERT_PATH:/ci-ca.crt:ro" \
  postgres:17 "$(basename "$0")" "$@"
PG17_WRAPPER
chmod 700 "$scratch/bin/pg17-client"
ln -s pg17-client "$scratch/bin/pg_dump"
ln -s pg17-client "$scratch/bin/pg_restore"

age-keygen -o "$scratch/identity.txt" >/dev/null 2>&1
export BACKUP_AGE_RECIPIENT
BACKUP_AGE_RECIPIENT="$(age-keygen -y "$scratch/identity.txt")"
export BACKUP_AGE_IDENTITY="$scratch/identity.txt"
export BACKUP_DIR="$scratch/backups"
export CI_CERT_PATH="$scratch/tls/server.crt"
export PGHOST=127.0.0.1 PGPORT=55432 PGUSER=postgres
export PGDATABASE=synthetic_source PGPASSWORD=synthetic-test-only-password
export PGSSLMODE=verify-full
export PATH="$scratch/bin:$PATH"

bash scripts/backup-public-db.sh

archive="$(find "$scratch/backups" -maxdepth 1 -type f -name '*.dump.age' -print -quit)"
[[ -n "$archive" && -s "$archive" ]] || {
  printf 'No encrypted synthetic archive generated.\n' >&2
  exit 1
}
[[ "$(stat -c '%a' "$archive")" == 600 ]] || {
  printf 'Synthetic archive file permissions are unsafe.\n' >&2
  exit 1
}

# Restore only into a new isolated database in the same ephemeral CI server.
docker exec "$container" createdb -U postgres synthetic_restored
age --decrypt --identity "$BACKUP_AGE_IDENTITY" "$archive" |
  PGDATABASE=synthetic_restored pg_restore \
    --exit-on-error --no-owner --no-acl --dbname=synthetic_restored

# Check real restored data, object references, historic wage-rate snapshots
# and the FK, rather than trusting a pg_restore --list manifest.
verify_sql="
SELECT
  (SELECT count(*) FROM public.zamestnanci),
  (SELECT count(*) FROM public.zoznam_zakaziek),
  (SELECT count(*) FROM public.objekty_stavby),
  (SELECT count(*) FROM public.dochadzka),
  (SELECT count(*) FROM public.nepritomnosti),
  (SELECT count(*) FROM public.dochadzka WHERE sadzba_snapshot IS NULL),
  (SELECT count(*) FROM public.dochadzka WHERE objekt_id = 202),
  (SELECT count(*) FROM pg_constraint
   WHERE conrelid = 'public.dochadzka'::regclass AND contype = 'f'),
  (SELECT md5(string_agg(row_to_json(d)::text, ',' ORDER BY d.id))
   FROM public.dochadzka d)
"
source="$(docker exec "$container" psql -X -A -t -U postgres -d synthetic_source -c "$verify_sql")"
restored="$(docker exec "$container" psql -X -A -t -U postgres -d synthetic_restored -c "$verify_sql")"
if [[ "$source" != "$restored" || "$restored" != 2\|2\|2\|3\|1\|1\|2\|1\|* ]]; then
  printf 'Synthetic restored attendance, workers, objects, snapshots or FK do not match.\n' >&2
  exit 1
fi
printf '%s\n' 'PASS: PostgreSQL 17 synthetic encrypted backup + verified TLS + actual isolated restore + data and FK equality.'
printf '%s\n' 'This does NOT verify or back up any live company database.'
