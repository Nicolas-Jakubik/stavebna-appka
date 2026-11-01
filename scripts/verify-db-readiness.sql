-- FiremnáApka: READ-ONLY metadata audit for a CONFIRMED target project.
-- No passwords, worker rows, timesheets, wages or secrets are selected.
-- Do NOT apply migrations from this file. Run only against verified project.

-- 1. Protected server-only RPC. 'is_object_aware' checks definition text, not behavior.
with rpc as (
  select p.oid, p.prosecdef, pg_get_functiondef(p.oid) as body
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='record_attendance_secure'
    and pg_get_function_identity_arguments(p.oid)='entries jsonb'
)
select
  count(*)=1 as rpc_signature_present,
  coalesce(bool_and(not prosecdef),false) as security_invoker,
  coalesce(bool_and(has_function_privilege('service_role',oid,'EXECUTE')),false) as service_role_can_execute,
  coalesce(bool_and(not has_function_privilege('anon',oid,'EXECUTE')),false) as anon_cannot_execute,
  coalesce(bool_and(not has_function_privilege('authenticated',oid,'EXECUTE')),false) as authenticated_cannot_execute,
  coalesce(bool_and(body like '%objekt_id%'),false) as is_object_aware
from rpc;

-- 2. The tables needed for attendance are private, server-readable and RLS-enabled.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  not has_table_privilege('anon',c.oid,'SELECT') as anon_cannot_select,
  not has_table_privilege('anon',c.oid,'INSERT') as anon_cannot_insert,
  not has_table_privilege('anon',c.oid,'UPDATE') as anon_cannot_update,
  not has_table_privilege('authenticated',c.oid,'SELECT') as authenticated_cannot_select,
  has_table_privilege('service_role',c.oid,'SELECT') as server_can_read
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind in ('r','p')
  and c.relname in ('dochadzka','nepritomnosti','zamestnanci','zoznam_zakaziek','objekty_stavby')
order by c.relname;

-- 3. Trigger metadata only. Two overlap triggers were present in the inspected
-- connected project; do NOT remove duplicates before an isolated restore test.
select t.tgname as trigger_name, t.tgenabled as enabled,
  p.proname as function_name
from pg_trigger t join pg_proc p on p.oid=t.tgfoid
where not t.tgisinternal and t.tgrelid='public.dochadzka'::regclass
order by t.tgname;
