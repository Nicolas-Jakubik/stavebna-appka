-- DEPLOYMENT GATE: apply ONLY after recorder-server code is deployed and verified.
-- Applying this while the old public client is deployed breaks attendance entry.
do $$
declare t text; p record; seq text;
begin
  if to_regprocedure('public.record_attendance_secure(jsonb)') is null then
    raise exception 'Install recorder_server_function first';
  end if;
  foreach t in array array['dochadzka','zamestnanci','zoznam_zakaziek','nepritomnosti'] loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    seq := pg_get_serial_sequence(format('public.%I', t), 'id');
    if seq is not null then
      execute format('revoke all on sequence %s from public, anon, authenticated', seq);
    end if;
  end loop;
end;
$$;
-- service_role retains its server-only privileges and bypasses RLS.
