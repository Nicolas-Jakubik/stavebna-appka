-- Executed ONLY against a disposable synthetic PostgreSQL 17 container.
-- The function and trigger under test are read unmodified from repository migrations.
\set ON_ERROR_STOP on

DO $verify_privileges$
BEGIN
  IF NOT has_function_privilege('service_role',
       'public.record_attendance_secure(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role lost RPC EXECUTE';
  END IF;
  IF has_function_privilege('anon',
       'public.record_attendance_secure(jsonb)', 'EXECUTE')
    OR has_function_privilege('authenticated',
       'public.record_attendance_secure(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'RPC accidentally callable by non-service roles';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p WHERE p.oid='public.record_attendance_secure(jsonb)'::regprocedure
      AND p.prosecdef
  ) THEN
    RAISE EXCEPTION 'RPC must remain SECURITY INVOKER';
  END IF;
END
$verify_privileges$;

-- Test helper lives only in disposable fixture, not in repository migrations.
CREATE FUNCTION public.ci_expect_rejection(
  case_name text, payload jsonb, expected_state text
) RETURNS void LANGUAGE plpgsql AS $test$
DECLARE
  actual_state text;
  before_rows bigint;
BEGIN
  SELECT count(*) INTO before_rows FROM public.dochadzka;
  BEGIN
    PERFORM public.record_attendance_secure(payload);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS actual_state = RETURNED_SQLSTATE;
  END;
  IF actual_state IS DISTINCT FROM expected_state THEN
    RAISE EXCEPTION 'Case % wanted SQLSTATE %, got %',
      case_name, expected_state, coalesce(actual_state,'success');
  END IF;
  IF (SELECT count(*) FROM public.dochadzka) <> before_rows THEN
    RAISE EXCEPTION 'Case % inserted partial/invalid records', case_name;
  END IF;
END
$test$;

SET ROLE service_role;

-- Correct multi-worker batch with active object and identical date/time.
SELECT public.record_attendance_secure('[
  {"meno":"CI Worker A","zakazka":"CI Project A","datum":"2026-10-20",
   "prichod":"07:00","odchod":"18:00","objekt_id":1},
  {"meno":"CI Worker B","zakazka":"CI Project A","datum":"2026-10-20",
   "prichod":"07:00","odchod":"18:00","objekt_id":1}
]'::jsonb);

DO $positive$
BEGIN
  IF (SELECT count(*) FROM public.dochadzka WHERE datum='2026-10-20') <> 2 THEN
    RAISE EXCEPTION 'Successful RPC did not store complete batch';
  END IF;
  IF (SELECT count(*) FROM public.dochadzka
      WHERE objekt_id=1 AND datum='2026-10-20') <> 2 THEN
    RAISE EXCEPTION 'Object association was not saved';
  END IF;
END
$positive$;

-- Every invalid case must fail without creating even one attendance row.
SELECT public.ci_expect_rejection('empty batch','[]'::jsonb,'22023');
SELECT public.ci_expect_rejection('unexpected field','[
  {"meno":"CI Worker A","zakazka":"CI Project A","datum":"2026-10-21",
   "prichod":"07:00","odchod":"10:00","sadzba_snapshot":999}
]'::jsonb,'22023');
SELECT public.ci_expect_rejection('wrong object belongs to other job','[
  {"meno":"CI Worker A","zakazka":"CI Project A","datum":"2026-10-21",
   "prichod":"07:00","odchod":"10:00","objekt_id":2}
]'::jsonb,'22023');
SELECT public.ci_expect_rejection('inactive object','[
  {"meno":"CI Worker A","zakazka":"CI Project A","datum":"2026-10-21",
   "prichod":"07:00","odchod":"10:00","objekt_id":3}
]'::jsonb,'22023');
SELECT public.ci_expect_rejection('inactive worker','[
  {"meno":"CI Inactive Worker","zakazka":"CI Project A","datum":"2026-10-21",
   "prichod":"07:00","odchod":"10:00","objekt_id":1}
]'::jsonb,'22023');
SELECT public.ci_expect_rejection('inactive job','[
  {"meno":"CI Worker A","zakazka":"CI Inactive Project","datum":"2026-10-21",
   "prichod":"07:00","odchod":"10:00"}
]'::jsonb,'22023');
SELECT public.ci_expect_rejection('overlapping shift','[
  {"meno":"CI Worker A","zakazka":"CI Project A","datum":"2026-10-20",
   "prichod":"17:00","odchod":"20:00","objekt_id":1}
]'::jsonb,'23505');
SELECT public.ci_expect_rejection('duplicate name in batch','[
  {"meno":"CI Worker A","zakazka":"CI Project A","datum":"2026-10-21",
   "prichod":"07:00","odchod":"10:00"},
  {"meno":"CI Worker A","zakazka":"CI Project A","datum":"2026-10-21",
   "prichod":"07:00","odchod":"10:00"}
]'::jsonb,'22023');
SELECT public.ci_expect_rejection('atomic batch on unknown second worker','[
  {"meno":"CI Worker A","zakazka":"CI Project A","datum":"2026-10-22",
   "prichod":"07:00","odchod":"18:00"},
  {"meno":"CI Nonexistent","zakazka":"CI Project A","datum":"2026-10-22",
   "prichod":"07:00","odchod":"18:00"}
]'::jsonb,'22023');

-- Verify nullable object and overnight shift handling, plus next-day overlap.
SELECT public.record_attendance_secure('[
  {"meno":"CI Worker B","zakazka":"CI Project B","datum":"2026-10-21",
   "prichod":"22:00","odchod":"02:00","objekt_id":null}
]'::jsonb);
SELECT public.ci_expect_rejection('overnight collision','[
  {"meno":"CI Worker B","zakazka":"CI Project B","datum":"2026-10-22",
   "prichod":"01:00","odchod":"03:00"}
]'::jsonb,'23505');
SELECT public.record_attendance_secure('[
  {"meno":"CI Worker B","zakazka":"CI Project B","datum":"2026-10-22",
   "prichod":"02:00","odchod":"03:00"}
]'::jsonb);
DO $adjacent$
BEGIN
  IF (SELECT count(*) FROM public.dochadzka
    WHERE meno='CI Worker B' AND datum='2026-10-22'
      AND prichod='02:00') <> 1 THEN
    RAISE EXCEPTION 'Adjacent overnight shifts were not retained';
  END IF;
END
$adjacent$;
RESET ROLE;

SELECT 'PASS: real repository RPC validation, service-only privileges and overnight overlap checks' AS result;
