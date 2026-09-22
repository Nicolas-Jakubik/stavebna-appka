create or replace function public.prevent_attendance_overlap()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.dochadzka d
    where d.meno = new.meno
      and d.id is distinct from new.id
      and (d.datum + d.prichod) <
          (new.datum + new.odchod + case when new.odchod <= new.prichod then interval '1 day' else interval '0' end)
      and (new.datum + new.prichod) <
          (d.datum + d.odchod + case when d.odchod <= d.prichod then interval '1 day' else interval '0' end)
  ) then
    raise exception 'Overlapping attendance'
      using errcode = '23505';
  end if;
  return new;
end;
$$;

revoke all on function public.prevent_attendance_overlap() from public, anon, authenticated;

drop trigger if exists prevent_attendance_overlap_trigger on public.dochadzka;
create trigger prevent_attendance_overlap_trigger
before insert or update of meno, datum, prichod, odchod
on public.dochadzka
for each row execute function public.prevent_attendance_overlap();

create index if not exists dochadzka_meno_datum_idx
on public.dochadzka (meno, datum);
