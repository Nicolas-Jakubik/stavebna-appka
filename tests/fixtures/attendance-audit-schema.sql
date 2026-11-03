-- This fixture only runs against an ephemeral GitHub Actions PostgreSQL database.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE TABLE public.zoznam_zakaziek(id bigint PRIMARY KEY, nazov text NOT NULL, stav text);
CREATE TABLE public.objekty_stavby(id bigint PRIMARY KEY, zakazka_id bigint NOT NULL, nazov text NOT NULL, aktivny boolean NOT NULL DEFAULT true);
CREATE TABLE public.zamestnanci(id bigint PRIMARY KEY, meno text NOT NULL);
CREATE TABLE public.dochadzka(
 id bigint PRIMARY KEY,
 created_at timestamptz NOT NULL DEFAULT now(),
 meno text,
 datum date,
 prichod time,
 odchod time,
 zakazka text,
 sadzba_snapshot double precision NOT NULL,
 objekt_id bigint
);
INSERT INTO public.zoznam_zakaziek(id,nazov,stav) VALUES (1,'Stavba Alfa','Aktívna');
INSERT INTO public.zamestnanci(id,meno) VALUES (1,'Fiktívny A');
INSERT INTO public.dochadzka(id,meno,datum,prichod,odchod,zakazka,sadzba_snapshot)
VALUES (101,'Fiktívny A',(now() AT TIME ZONE 'Europe/Bratislava')::date,'07:00','18:00','Stavba Alfa',12.75);
