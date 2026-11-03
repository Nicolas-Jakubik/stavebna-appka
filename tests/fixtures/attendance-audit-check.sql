-- Test after attendance migration. No real workers, rates or projects are touched.
DO $$
DECLARE item public.dochadzka%rowtype;
DECLARE audit_count integer;
BEGIN
  SELECT * INTO item FROM public.dochadzka WHERE id=101;
  IF item.edit_revision<>0 OR item.edit_locked THEN RAISE EXCEPTION 'default metadata incorrect'; END IF;
  IF has_function_privilege('anon','public.sd_edit_attendance(bigint,integer,text,time,time,text,bigint,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'anonymous role can execute privileged edit function';
  END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.dochadzka_zmeny'::regclass) THEN
    RAISE EXCEPTION 'audit table must have RLS';
  END IF;
END;
$$;

SELECT public.sd_edit_attendance(101,0,'Vedúci ukážka','07:00','17:00','Stavba Alfa',null,false);
DO $$
DECLARE x public.dochadzka%rowtype;
BEGIN
 SELECT * INTO x FROM public.dochadzka WHERE id=101;
 IF x.edit_revision<>1 OR x.edit_locked OR x.edited_by<>'Vedúci ukážka'
   OR x.odchod<>'17:00' OR x.sadzba_snapshot<>12.75 THEN
  RAISE EXCEPTION 'recorder edit changed wrong data';
 END IF;
END;
$$;

-- A stale edit cannot silently overwrite a newer revision.
DO $$
BEGIN
 PERFORM public.sd_edit_attendance(101,0,'Vedúci ukážka','07:00','18:00','Stavba Alfa',null,false);
 RAISE EXCEPTION 'stale edit unexpectedly succeeded';
EXCEPTION WHEN serialization_failure THEN NULL;
END;
$$;

-- Any direct admin time correction must be audited and locked.
UPDATE public.dochadzka SET odchod='18:00' WHERE id=101;
DO $$
DECLARE x public.dochadzka%rowtype;
BEGIN
 SELECT * INTO x FROM public.dochadzka WHERE id=101;
 IF x.edit_revision<>2 OR NOT x.edit_locked OR x.edited_by<>'Administrátor'
   OR x.sadzba_snapshot<>12.75 THEN RAISE EXCEPTION 'admin edit not locked'; END IF;
END;
$$;

DO $$
BEGIN
 PERFORM public.sd_edit_attendance(101,2,'Vedúci ukážka','07:00','17:00','Stavba Alfa',null,false);
 RAISE EXCEPTION 'recorder changed locked admin row';
EXCEPTION WHEN raise_exception THEN
 IF SQLERRM <> 'locked_by_admin' THEN RAISE; END IF;
END;
$$;

SELECT public.sd_edit_attendance(101,2,'Administrátor','07:00','17:30','Stavba Alfa',null,true);
UPDATE public.dochadzka SET sadzba_snapshot=14.25 WHERE id=101;
DO $$
DECLARE x public.dochadzka%rowtype;
DECLARE audit_count integer;
BEGIN
 SELECT count(*) INTO audit_count FROM public.dochadzka_zmeny WHERE dochadzka_id=101;
 -- Exactly three attendance corrections: recorder, direct admin and admin RPC.
 IF audit_count<>3 THEN RAISE EXCEPTION 'audit event count is not 3'; END IF;
 SELECT * INTO x FROM public.dochadzka WHERE id=101;
 IF x.edit_revision<>3 OR NOT x.edit_locked OR x.sadzba_snapshot<>14.25 THEN
   RAISE EXCEPTION 'payroll rate-only mutation changed lock or revision';
 END IF;
END;
$$;
