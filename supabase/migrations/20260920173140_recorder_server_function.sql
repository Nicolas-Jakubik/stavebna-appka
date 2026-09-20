-- Safe to install before the recorder deployment; only the server can execute it.
create or replace function public.record_attendance_secure(entries jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
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
      or coalesce(item->>'meno','') !~ '\S' or length(item->>'meno') > 200
      or coalesce(item->>'zakazka','') !~ '\S' or length(item->>'zakazka') > 300
      or coalesce(item->>'datum','') !~ '^\d{4}-\d{2}-\d{2}$'
      or coalesce(item->>'prichod','') !~ '^([01]\d|2[0-3]):(00|15|30|45)$'
      or coalesce(item->>'odchod','') !~ '^([01]\d|2[0-3]):(00|15|30|45)$'
      or item->>'prichod' = item->>'odchod' then
      raise exception 'Invalid values' using errcode = '22023';
    end if;
  end loop;
  if (select count(distinct value->>'meno') from jsonb_array_elements(entries)) <> jsonb_array_length(entries)
    or (select count(distinct (value->>'datum',value->>'zakazka',value->>'prichod',value->>'odchod')) from jsonb_array_elements(entries)) <> 1 then
    raise exception 'Invalid batch' using errcode = '22023';
  end if;
  -- Serialize overlap check and insert, including concurrent admin writes.
  lock table public.dochadzka in share row exclusive mode;
  for r in select * from jsonb_to_recordset(entries)
    as e(meno text, zakazka text, datum date, prichod time, odchod time) loop
    if not exists(select 1 from public.zamestnanci z where z.meno = r.meno)
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
