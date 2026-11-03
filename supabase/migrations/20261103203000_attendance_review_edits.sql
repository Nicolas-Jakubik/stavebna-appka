-- Additive change. Historical attendance and hourly-rate snapshots are preserved.
ALTER TABLE public.dochadzka
  ADD COLUMN IF NOT EXISTS edit_revision integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS edit_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_by text;

CREATE TABLE IF NOT EXISTS public.dochadzka_zmeny (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dochadzka_id bigint NOT NULL,
  meno text,
  datum date,
  changed_at timestamptz NOT NULL DEFAULT now(),
  actor_label text NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind IN ('recorder','admin')),
  old_values jsonb NOT NULL,
  new_values jsonb NOT NULL,
  revision integer NOT NULL
);
CREATE INDEX IF NOT EXISTS dochadzka_zmeny_entry_recent_idx
  ON public.dochadzka_zmeny (dochadzka_id, changed_at DESC, id DESC);
ALTER TABLE public.dochadzka_zmeny ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.dochadzka_zmeny FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.dochadzka_zmeny TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.dochadzka_zmeny_id_seq TO service_role;

CREATE OR REPLACE FUNCTION public.sd_attendance_change_metadata()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE recorder_actor text;
BEGIN
  IF ROW(NEW.meno, NEW.datum, NEW.zakazka, NEW.objekt_id, NEW.prichod, NEW.odchod)
    IS NOT DISTINCT FROM ROW(OLD.meno, OLD.datum, OLD.zakazka, OLD.objekt_id, OLD.prichod, OLD.odchod) THEN
    -- Payroll-only updates must not change attendance revision or locks.
    NEW.edit_revision := OLD.edit_revision;
    NEW.edited_at := OLD.edited_at;
    NEW.edited_by := OLD.edited_by;
    NEW.edit_locked := OLD.edit_locked;
    RETURN NEW;
  END IF;

  recorder_actor := NULLIF(pg_catalog.current_setting('sd_evidencia.recorder_actor', true), '');
  IF recorder_actor IS NOT NULL THEN
    IF OLD.edit_locked THEN
      RAISE EXCEPTION 'locked_by_admin' USING ERRCODE = 'P0001';
    END IF;
    NEW.edit_locked := false;
    NEW.edited_by := recorder_actor;
  ELSE
    NEW.edit_locked := true;
    NEW.edited_by := 'Administrátor';
  END IF;
  NEW.edit_revision := OLD.edit_revision + 1;
  NEW.edited_at := now();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sd_attendance_change_metadata() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sd_attendance_write_audit()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF ROW(NEW.meno, NEW.datum, NEW.zakazka, NEW.objekt_id, NEW.prichod, NEW.odchod)
    IS NOT DISTINCT FROM ROW(OLD.meno, OLD.datum, OLD.zakazka, OLD.objekt_id, OLD.prichod, OLD.odchod) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.dochadzka_zmeny
  (dochadzka_id, meno, datum, actor_label, actor_kind, old_values, new_values, revision)
  VALUES (
    NEW.id, NEW.meno, NEW.datum, NEW.edited_by,
    CASE WHEN NEW.edit_locked THEN 'admin' ELSE 'recorder' END,
    pg_catalog.jsonb_build_object('meno', OLD.meno, 'datum', OLD.datum, 'zakazka', OLD.zakazka, 'objekt_id', OLD.objekt_id, 'prichod', OLD.prichod, 'odchod', OLD.odchod),
    pg_catalog.jsonb_build_object('meno', NEW.meno, 'datum', NEW.datum, 'zakazka', NEW.zakazka, 'objekt_id', NEW.objekt_id, 'prichod', NEW.prichod, 'odchod', NEW.odchod),
    NEW.edit_revision
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.sd_attendance_write_audit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS sd_attendance_change_metadata_trigger ON public.dochadzka;
CREATE TRIGGER sd_attendance_change_metadata_trigger
  BEFORE UPDATE ON public.dochadzka
  FOR EACH ROW EXECUTE FUNCTION public.sd_attendance_change_metadata();
DROP TRIGGER IF EXISTS sd_attendance_audit_trigger ON public.dochadzka;
CREATE TRIGGER sd_attendance_audit_trigger
  AFTER UPDATE ON public.dochadzka
  FOR EACH ROW EXECUTE FUNCTION public.sd_attendance_write_audit();

CREATE OR REPLACE FUNCTION public.sd_edit_attendance(
  p_id bigint, p_revision integer, p_actor text,
  p_prichod time, p_odchod time, p_zakazka text, p_objekt_id bigint,
  p_admin boolean
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE existing public.dochadzka%rowtype;
DECLARE updated public.dochadzka%rowtype;
DECLARE current_day date := (now() AT TIME ZONE 'Europe/Bratislava')::date;
BEGIN
  IF CURRENT_USER <> 'service_role' AND CURRENT_USER <> 'postgres' THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL OR p_id < 1 OR p_revision IS NULL OR p_revision < 0
    OR p_actor IS NULL OR char_length(btrim(p_actor)) NOT BETWEEN 1 AND 60
    OR p_admin IS NULL OR p_prichod IS NULL OR p_odchod IS NULL OR p_zakazka IS NULL
    OR char_length(btrim(p_zakazka)) NOT BETWEEN 1 AND 300
    OR p_prichod = p_odchod
    OR extract(minute from p_prichod)::integer % 15 <> 0
    OR extract(minute from p_odchod)::integer % 15 <> 0
    OR extract(second from p_prichod) <> 0 OR extract(second from p_odchod) <> 0
    THEN RAISE EXCEPTION 'invalid_correction' USING ERRCODE = '22023';
  END IF;

  -- Serialize with recorder inserts and the existing overlap constraint.
  LOCK TABLE public.dochadzka IN SHARE ROW EXCLUSIVE MODE;
  SELECT * INTO existing FROM public.dochadzka WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002'; END IF;
  IF existing.edit_revision <> p_revision THEN
    RAISE EXCEPTION 'stale_version' USING ERRCODE = '40001';
  END IF;
  IF NOT p_admin AND existing.edit_locked THEN
    RAISE EXCEPTION 'locked_by_admin' USING ERRCODE = 'P0001';
  END IF;
  IF NOT p_admin AND (existing.datum < current_day - 31 OR existing.datum > current_day) THEN
    RAISE EXCEPTION 'outside_edit_window' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.zoznam_zakaziek z WHERE z.nazov = p_zakazka
    AND (z.stav = 'Aktívna' OR z.nazov = existing.zakazka)) THEN
    RAISE EXCEPTION 'unknown_project' USING ERRCODE = '22023';
  END IF;
  IF p_objekt_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.objekty_stavby o JOIN public.zoznam_zakaziek z ON z.id = o.zakazka_id
    WHERE o.id = p_objekt_id AND z.nazov = p_zakazka AND o.aktivny = true
  ) THEN RAISE EXCEPTION 'invalid_object' USING ERRCODE = '22023'; END IF;

  IF p_admin THEN
    PERFORM pg_catalog.set_config('sd_evidencia.recorder_actor', '', true);
  ELSE
    PERFORM pg_catalog.set_config('sd_evidencia.recorder_actor', btrim(p_actor), true);
  END IF;

  UPDATE public.dochadzka SET
    prichod = p_prichod,
    odchod = p_odchod,
    zakazka = p_zakazka,
    objekt_id = p_objekt_id
  WHERE id = p_id
  RETURNING * INTO updated;

  RETURN pg_catalog.jsonb_build_object(
    'id', updated.id, 'revision', updated.edit_revision,
    'locked', updated.edit_locked, 'edited_at', updated.edited_at,
    'edited_by', updated.edited_by
  );
END;
$$;
REVOKE ALL ON FUNCTION public.sd_edit_attendance(bigint,integer,text,time,time,text,bigint,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sd_edit_attendance(bigint,integer,text,time,time,text,bigint,boolean) TO service_role;
