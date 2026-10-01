create or replace function public.validate_project_object_assignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.objekt_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.objekty_stavby o
    where o.id = new.objekt_id
      and o.zakazka_id = new.zakazka_id
  ) then
    raise exception 'Project object does not belong to project'
      using errcode = '23503';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_project_object_assignment() from public, anon, authenticated;
grant execute on function public.validate_project_object_assignment() to service_role;

drop trigger if exists enforce_project_object_naklady_stavby on public.naklady_stavby;
create trigger enforce_project_object_naklady_stavby
before insert or update of zakazka_id, objekt_id on public.naklady_stavby
for each row execute function public.validate_project_object_assignment();

drop trigger if exists enforce_project_object_faktury_dodavatelov on public.faktury_dodavatelov;
create trigger enforce_project_object_faktury_dodavatelov
before insert or update of zakazka_id, objekt_id on public.faktury_dodavatelov
for each row execute function public.validate_project_object_assignment();

drop trigger if exists enforce_project_object_faktury_klientov on public.faktury_klientov;
create trigger enforce_project_object_faktury_klientov
before insert or update of zakazka_id, objekt_id on public.faktury_klientov
for each row execute function public.validate_project_object_assignment();

drop trigger if exists enforce_project_object_platby_stavby on public.platby_stavby;
create trigger enforce_project_object_platby_stavby
before insert or update of zakazka_id, objekt_id on public.platby_stavby
for each row execute function public.validate_project_object_assignment();

drop trigger if exists enforce_project_object_uhrady_pracovnikov on public.uhrady_pracovnikov;
create trigger enforce_project_object_uhrady_pracovnikov
before insert or update of zakazka_id, objekt_id on public.uhrady_pracovnikov
for each row execute function public.validate_project_object_assignment();
