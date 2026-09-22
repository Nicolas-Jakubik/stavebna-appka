alter table public.zamestnanci
  add column if not exists aktivny boolean not null default true;

alter table public.dochadzka
  add column if not exists sadzba_snapshot double precision;

update public.dochadzka d
set sadzba_snapshot = coalesce(z.sadzba, 0)
from public.zamestnanci z
where d.sadzba_snapshot is null
  and trim(z.meno) = trim(d.meno);

update public.dochadzka
set sadzba_snapshot = 0
where sadzba_snapshot is null;

alter table public.dochadzka
  alter column sadzba_snapshot set not null;

create index if not exists dochadzka_meno_datum_idx
  on public.dochadzka(meno, datum);

create or replace function public.set_attendance_rate_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
declare worker_rate double precision;
begin
  if new.sadzba_snapshot is null then
    select coalesce(z.sadzba, 0)
      into worker_rate
    from public.zamestnanci z
    where trim(z.meno) = trim(new.meno)
    limit 1;
    new.sadzba_snapshot := coalesce(worker_rate, 0);
  end if;
  return new;
end;
$$;

drop trigger if exists dochadzka_set_rate_snapshot on public.dochadzka;
create trigger dochadzka_set_rate_snapshot
before insert on public.dochadzka
for each row execute function public.set_attendance_rate_snapshot();

revoke all on function public.set_attendance_rate_snapshot() from public, anon, authenticated;
grant execute on function public.set_attendance_rate_snapshot() to service_role;

create or replace function public.prevent_attendance_overlap()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.datum is not distinct from old.datum
     and new.prichod is not distinct from old.prichod
     and new.odchod is not distinct from old.odchod then
    return new;
  end if;

  if exists (
    select 1
    from public.dochadzka d
    where d.id is distinct from new.id
      and d.meno = new.meno
      and d.datum between new.datum - 1 and new.datum + 1
      and d.datum + d.prichod
          < new.datum + new.odchod
            + case when new.odchod <= new.prichod then interval '1 day' else interval '0' end
      and new.datum + new.prichod
          < d.datum + d.odchod
            + case when d.odchod <= d.prichod then interval '1 day' else interval '0' end
  ) then
    raise exception 'Overlapping attendance' using errcode = '23505';
  end if;

  return new;
end;
$$;

drop trigger if exists dochadzka_prevent_overlap on public.dochadzka;
create trigger dochadzka_prevent_overlap
before insert or update on public.dochadzka
for each row execute function public.prevent_attendance_overlap();

revoke all on function public.prevent_attendance_overlap() from public, anon, authenticated;
grant execute on function public.prevent_attendance_overlap() to service_role;

create or replace function public.record_attendance_secure(entries jsonb)
returns void
language plpgsql
set search_path to ''
as $$
declare item jsonb; r record;
begin
  if jsonb_typeof(entries) is distinct from 'array' then
    raise exception 'Expected entries array' using errcode = '22023';
  end if;
  if jsonb_array_length(entries) not between 1 and 200 then
    raise exception 'Invalid batch size' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(entries) loop
    if jsonb_typeof(item) is distinct from 'object' then
      raise exception 'Invalid entry' using errcode = '22023';
    end if;
    if (select array_agg(key order by key) from jsonb_object_keys(item) key)
       is distinct from array['datum','meno','odchod','prichod','zakazka'] then
      raise exception 'Invalid fields' using errcode = '22023';
    end if;
    if exists (select 1 from jsonb_each(item) where jsonb_typeof(value) <> 'string')
      or coalesce(item->>'meno','') !~ '\\S' or length(item->>'meno') > 200
      or coalesce(item->>'zakazka','') !~ '\\S' or length(item->>'zakazka') > 300
      or coalesce(item->>'datum','') !~ '^\\d{4}-\\d{2}-\\d{2}$'
      or coalesce(item->>'prichod','') !~ '^([01]\\d|2[0-3]):(00|15|30|45)$'
      or coalesce(item->>'odchod','') !~ '^([01]\\d|2[0-3]):(00|15|30|45)$'
      or item->>'prichod' = item->>'odchod' then
      raise exception 'Invalid values' using errcode = '22023';
    end if;
  end loop;
  if (select count(distinct value->>'meno') from jsonb_array_elements(entries)) <> jsonb_array_length(entries)
    or (select count(distinct (value->>'datum',value->>'zakazka',value->>'prichod',value->>'odchod')) from jsonb_array_elements(entries)) <> 1 then
    raise exception 'Invalid batch' using errcode = '22023';
  end if;
  lock table public.dochadzka in share row exclusive mode;
  for r in select * from jsonb_to_recordset(entries)
    as e(meno text, zakazka text, datum date, prichod time, odchod time) loop
    if not exists(select 1 from public.zamestnanci z where z.meno = r.meno and z.aktivny = true)
      or not exists(select 1 from public.zoznam_zakaziek z where z.nazov = r.zakazka and z.stav = 'Aktívna') then
      raise exception 'Unknown worker or inactive job' using errcode = '22023';
    end if;
    if exists(select 1 from public.dochadzka d where d.meno = r.meno
      and d.datum + d.prichod < r.datum + r.odchod + case when r.odchod < r.prichod then interval '1 day' else interval '0' end
      and r.datum + r.prichod < d.datum + d.odchod + case when d.odchod <= d.prichod then interval '1 day' else interval '0' end) then
      raise exception 'Overlapping attendance' using errcode = '23505';
    end if;
  end loop;
  insert into public.dochadzka(meno, zakazka, datum, prichod, odchod)
    select meno, zakazka, datum, prichod, odchod from jsonb_to_recordset(entries)
      as e(meno text, zakazka text, datum date, prichod time, odchod time);
end;
$$;

revoke all on function public.record_attendance_secure(jsonb) from public, anon, authenticated;
grant execute on function public.record_attendance_secure(jsonb) to service_role;
