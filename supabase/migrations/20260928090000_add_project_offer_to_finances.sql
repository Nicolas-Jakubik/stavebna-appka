alter table public.financie_stavby
  add column if not exists ponuka_nazov text,
  add column if not exists ponuka_datum date,
  add column if not exists ponuka_variant text,
  add column if not exists ponuka_pocet_objektov integer,
  add column if not exists ponuka_plocha_m2 numeric(12,2),
  add column if not exists ponuka_cielova_cena_m2 numeric(12,2),
  add column if not exists ponuka_suma_bez_dph numeric(14,2),
  add column if not exists ponuka_suma_s_dph numeric(14,2),
  add column if not exists ponuka_dokument_url text,
  add column if not exists ponuka_polozky jsonb not null default '[]'::jsonb;
