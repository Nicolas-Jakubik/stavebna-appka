# FiremnáApka – read-only kontrola databázovej bezpečnosti

**Kontrolný bod:** SD-EVIDENCIA-OPRAVY-2026-10-28, 28.10.2026.
**Stav:** Overené iba čítaním databázových metadát; bez zmeny SQL schémy a bez zápisu do používateľských dát.
**Projekt:** Supabase pripojený pod názvom MojaFiremnaApp. **Nie je potvrdené**, že tento projekt je zdrojom aktuálneho produkčného Vercel deployu. Ak sa použije iný projekt, výsledok sa naň NEPRENÁŠA.

## Zistenia

1. Funkcia **public.record_attendance_secure(jsonb)** existuje a používa SECURITY INVOKER. Prístup EXECUTE: anon = NIE, authenticated = NIE, service_role = ÁNO. Funkcia podporuje voliteľné **objekt_id**, overuje jeho väzbu na aktívnu stavbu, aktívnych pracovníkov a prekrývajúce sa smeny. Funkcia sa nespúšťala ani netestovala reálnym zápisom.
2. Tabuľky **dochadzka, zamestnanci, zoznam_zakaziek, nepritomnosti, objekty_stavby** majú RLS zapnuté. Pre anon sa nezistilo oprávnenie SELECT/INSERT/UPDATE a pre authenticated sa nezistilo SELECT; service_role má SELECT. Ide o čítanie metadát, nie o penetračný test všetkých oprávnení.
3. Tabuľka dochadzka má tri zapnuté triggery: **dochadzka_prevent_overlap**, **prevent_attendance_overlap_trigger**, **dochadzka_set_rate_snapshot**. Prvé dva spúšťajú tú istú funkciu **prevent_attendance_overlap()**. To znamená duplicitné vyhodnotenie prekryvu pri vkladaní/niektorých úpravách. Bez zálohy a izolovaných integračných testov nezakazovať ani nemazať žiadny trigger. Tretí trigger dopĺňa sadzbu pri vložení.
4. **Historické definície RPC vs. aktuálny stav:** migrácie `20260920173140_recorder_server_function.sql` a `20260923063000_fix_recorder_validation.sql` používajú staršiu definíciu bez `objekt_id`, ale **novšia migrácia `20261001103500_project_objects.sql` už podporu `objekt_id` obsahuje** a zodpovedá preverenej funkčnosti v pripojenom projekte. Nesmie sa teda tvrdiť, že posledná verzia kódu podporu objektov nemá. Otvorená zostáva nezhoda/úplnosť **zaznamenanej migračnej histórie** pripojeného projektu a príslušných Git súborov. **Nespúšťať naslepo staré migrácie nad obnovenou databázou.** Úplný `pg_dump` schémy `public` obsahuje aktuálnu definíciu funkcie.
5. Skript scripts/backup-public-db.sh bol upravený, aby uložil len zašifrovaný **.dump.age** a nepísal nešifrovaný dump na disk. CI s fiktívnym dumpom overil šifrovanie/dešifrovanie. Žiadna reálna databázová záloha ani obnova nebola vykonaná.

## Reprodukovateľné read-only kontroly

Kontrolu bezpečnosti funkcie možno zopakovať SQL dotazom nad **potvrdeným projektom**:

```sql
select p.oid::regprocedure::text as function_name,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anonymous_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as user_can_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as server_can_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.proname='record_attendance_secure';
```

Kontrolu počtu a stavu triggerov možno zopakovať:

```sql
select tgname, tgenabled, pg_get_triggerdef(oid, true) as trigger_definition
from pg_trigger
where not tgisinternal and tgrelid='public.dochadzka'::regclass
order by tgname;
```

SQL vyššie iba číta katalógové metadáta; nesmie sa z neho odvodiť, že je bezpečné nasadiť bez skúšobnej obnovy a reálnych používateľských testov.

## Dodatočný bezpečný SQL test – 29.10.2026

Doplnili sme `scripts/test-synthetic-recorder-rpc.sh` a `tests/fixtures/recorder-rpc-integration.sql`, ktoré na **izolovanom kontajneri PostgreSQL 17 bez sieťového pripojenia** spúšťajú aktuálny SQL text `record_attendance_secure` vyňatý priamo z najnovšej Git migrácie a skutočný migračný trigger na prekrývanie smien. Preverujú skutočné volania RPC s objektmi, neaktívnymi pracovníkmi/stavbami, chyby SQLSTATE 22023/23505, nočné smeny, atómovosť dávok, prístupové práva rolí a simultánne rovnaké zápisy. Pridaný druhý **testovací** overlap trigger simuluje topológiu s dvoma kontrolami nájdenú v metadátach pripojeného projektu. [GitHub CI 40874960863 – SUCCESS](https://github.com/Nicolas-Jakubik/stavebna-appka/actions/runs/40874960863).

**Dôležitý limit:** test bežal iba na minimalistickej umelej schéme, nie na pripojenej ani reálnej produkčnej databáze, a nenahrádza obnovu a testy údajov firmy. Pôvodná read-only DB kontrola stále platí; žiadne live zápisy ani trigger DDL neprebehli.

## Povinné pred produkciou

- Overiť správne Vercel nasadenie a skutočný projekt Supabase (bez zverejnenia service-role kľúčov).
- Uložiť šifrovaný, obnoviteľný dump a otestovať obnovu mimo produkcie.
- Otestovať RPC s objekt_id aj bez neho, súbežné zápisy, historické sadzby, oba overlap triggery a celý proces zapisovateľa na izolovanej obnove.
- Zosúladiť stav migrácií s aktuálnou schémou; žiadny automatický replay na produkcii.
- PR #102 zostáva Draft, bez merge a bez produkčných úprav.
