# FiremnáApka – bezpečný plán overenia a nasadenia (DRAFT)
**Identifikátor:** SD-EVIDENCIA-OPRAVY-2026-10-28  
**Súvisiaci kontrolný PR:** [#102](https://github.com/Nicolas-Jakubik/stavebna-appka/pull/102)  
**Stav k 28.10.2026:** 0 % opráv nasadených. Dokument je plán, nie povolenie nasadenia.

## Nevyhnutné STOP podmienky
- [ ] Dôveryhodný počítač, mimo GitHubu uložený **age** dešifrovací kľúč (s oddelenou záložnou kópiou), bezpečné šifrované úložisko a overený správny DB projekt. Skript ukladá iba súbor `.dump.age` bez dočasného plaintextu.
- [ ] Pred spustením zálohy nastaviť lokálny súkromný `BACKUP_AGE_IDENTITY` a TLS `PGSSLMODE=require` / `verify-ca` / `verify-full`. Skript odmieta neoverené archívy a nezabezpečené pripojenia. Odporúča sa `verify-full` pri správne nastavenej dôveryhodnej certifikačnej autorite.
- [ ] Prevedený **skutočný** `pg_dump` schémy `public` pomocou `scripts/backup-public-db.sh`; hash archívu bezpečne zapísaný do súkromného protokolu.
- [x] **Len syntetický CI test:** úspešné šifrovanie a izolovaná obnova testovacej PG17 databázy s vymyslenou dochádzkou; [CI 40696663182](https://github.com/Nicolas-Jakubik/stavebna-appka/actions/runs/40696663182). **Toto nezaškrtáva nasledujúcu povinnú skúšku firemnej zálohy.**
- [ ] `pg_restore` do **samostatnej neprodukčnej** PostgreSQL 17 databázy. Overené počty záznamov (najmä `dochadzka`), kontrolné súčty/základné kľúče, väzby a používateľsky dôležité výstupy. Samotné `pg_restore --list` nie je test obnovy.
- [ ] Zdokumentované, čo je mimo exportu: Supabase Auth, Storage súbory, projektové nastavenia, Vercel secrets. Ak sú potrebné pre prevádzku, samostatne zazálohovať a otestovať obnovu.
- [ ] **Potvrdená už produkčná vetva/commit na Verceli:** `main`/`8a2d40d`, projekt aj doména identifikované. Ešte **nepotvrdený Supabase projektový ref**, lebo `NEXT_PUBLIC_SUPABASE_URL` je v konektore označená `sensitive` a jej hodnota nebola vrátená. [Presný postup](VERCEL_PRODUCTION_MAPPING.md). Až potom vybrať zdroj zálohy.
- [ ] V **potvrdenej cieľovej produkčnej databáze** zopakovať read-only kontrolu funkcie `record_attendance_secure` a jej grantov. V pripojenom projekte `MojaFiremnaApp` bola metadátová kontrola úspešná (serverová rola áno, anon/authenticated nie); samotná väzba na Vercel **nebola potvrdená**. Funkciu a zápisy vrátane `objekt_id` testovať iba v izolácii.
- [ ] **Zosúladiť históriu migrácií:** pôvodné RPC SQL súbory nepoznajú `objekt_id`, ale neskoršia migrácia `20261001103500_project_objects.sql` podporu obsahuje. Overiť poradie a skutočné aplikované verzie, nemeniť overlap triggery pred izolovaným testom. [Databázový audit](DB_READONLY_AUDIT_2026-10-28.md).
- [ ] Neprodukčné testovacie prostredie oddelené od produkcie (žiadne produkčné service-role kľúče v Preview). K 28.10.2026 pri projekte `MojaFiremnaApp` nebola nájdená Supabase vývojová databázová vetva.
- [ ] Vercel Preview `sd-evidencia` úspešne zostavený a prístupný: hlásenie `build-rate-limit` blokuje spoľahlivé overenie.
- [ ] Výsledky skúšok schválené, uložení odkazy na testy a potvrdený výslovný súhlas s nasadením.

## Testovacia matica v izolovanom prostredí
| Oblasť | Čo overiť | Kritérium |
| --- | --- | --- |
| Zapisovateľ | iPhone Safari, Android Chrome, desktop; nový prístupový odkaz; zotrvanie cookie po zavretí prehliadača podľa nastavenia | Prihlásený zapisovateľ zapisuje; anonymný používateľ nevidí/nezapisuje údaje |
| Administrátor | Prihlásenie, čítanie a editácia; vylúčiť PATCH bez filtra, testovať cielené ID a zámerné historické premenovanie; otestovať mazanie na testovacích riadkoch | Neobmedzený PATCH/DELETE je odmietnutý, povolené operácie fungujú bez nečakaných zmien |
| Dochádzka | Rozdelenie jednej smeny medzi stavby, duplicita/prekryv, dátumy a časy | Nedôjde k nechcenému prepísaniu údajov ani duplicitnému zápisu |
| Výplaty | Septembrové/októbrové pôvodné výpisy a snapshot sadzby; 1. a 2. polovica mesiaca; PDF; dataset >1 000 riadkov a prerušenie neskorej stránky | Kontrolné súčty sedia, stránkovanie je úplné a pri chybe nie je možné vytvoriť zavádzajúce PDF |
| Financie | Dataset s 1 184+ záznamami, presne 1 000 a prerušenie druhej stránky | Všetky riadky sú započítané; pri neúplnosti sa súčty **nezobrazia** |
| Dashboard | Kontrola duplicít a prekryvov, filtre, neprítomnosti a včerajšok pri viac než 1 000 záznamoch | Jednotlivé záznamy sa načítajú kompletne, bez čiastočných súčtov; kód upravený, izolovaný test čaká |
| Zapisovateľ | Úplný zoznam pracovníkov/stavieb, týždenný prehľad, kontrola duplicitných smien a 1 001+ záznamov | API vracia max. 500 riadkov na stránku, klient načíta všetky; pri chybe sa zápis zablokuje; serverová RPC funkcia sa musí overiť na testovacej DB |
| Financie | Náklady, úhrady, faktúry oboch typov, výplaty pracovníkov a projektové súčty aj nad 1 000 riadkov | Žiadne skrátené výsledky ani zavádzajúce súčty, overené na izolovanej DB |
| Stavby | Počet smien, hodiny a posledná aktivita aj pri viac než 1 000 záznamoch | Kompletné údaje, pri chybe zablokovaný prehľad a úpravy |
| Pracovníci | Odpracované hodiny, počet smien, posledná aktivita a neprítomnosti nad 1 000 riadkov | Kompletný výpočet, pri chybe nie sú zobrazované neúplné súhrny |
| Základné operácie | Zoznam stavieb, pracovníkov, neprítomností, mobilné načítanie | Bez regresie, bez úpravy produkčných údajov |

## Pripravenosť na nasadenie – bez plánovanej odstávky
1. Vybrať pokojné obdobie mimo bežného zapisovania; rezervovať človeka, ktorý môže okamžite preveriť produkčný stav.
2. Vopred pripraviť jednoduché inštrukcie zapisovateľom: po zmene treba otvoriť **nový súkromný prístupový odkaz**. Nezverejňovať tokeny do GitHubu ani do verejných logov.
3. Skontrolovať zachovaný referenčný produkčný commit `8a2d40dfcfcd7d68557db7d2c6f94c6e99e5aa7d`, zálohu, Vercel predchádzajúce funkčné nasadenie a pravidlá obnovenia.
4. **Až po výslovnom povolení:** kontrolovane schváliť PR do `main`, overiť nový build a routovanie produkčnej domény.
5. Po deployi vykonať bezškodové kontroly: otvorenie a prihlásenie, prístupový odkaz zapisovateľa, čítanie aktuálnej dochádzky, výplatných/finančných súčtov. Produkčné „testovacie“ smeny nevytvárať.
6. Po prvých reálnych zápisoch overiť, či nespôsobujú chyby; oznámiť používateľom postup. **Bezodstávkový priebeh je cieľ, nie garancia** – nové prístupové pravidlá môžu zablokovať staré anonymné odkazy.

## Návratový postup (rollback)
- **Ak zlyhá autentifikácia, zápis, financie alebo build:** zastaviť ďalšie zmeny, obnoviť predchádzajúce funkčné Vercel nasadenie / verzovaný aplikačný commit až po kontrole dôsledkov a oprávnení.
- Návrat aplikácie **nie je návrat databázy**. Tieto PR neobsahujú databázovú migráciu; bežný rollback preto **nesmie** obnovovať starý dump nad živé údaje, lebo by mohol zmazať nové dochádzky.
- Ak by bolo potrebné obnovenie dát, vypracovať osobitný incidentný postup zachovania **všetkých zápisov vykonaných po zálohe** a vykonať ho iba so schválením.
- Každý incident zaznamenať (čas, verzia, dopad, spôsob nápravy); ponechať auditnú stopu.

## Záznam schválenia
- Záloha a hash **skutočnej databázy: NEOVERENÉ**; posledný skript má povinné dešifrovanie/archívny listing a TLS; **reálne PostgreSQL 17 nástroje boli testované iba na fiktívnych dátach** (GitHub Actions [40673195394](https://github.com/Nicolas-Jakubik/stavebna-appka/actions/runs/40673195394))
- Izolovaná obnova **skutočnej produkčnej zálohy: NEOVERENÉ**. Obnova v PostgreSQL 17 nad výlučne fiktívnymi tabuľkami/dochádzkou s reálnym `pg_dump | age | pg_restore` **ÚSPEŠNÁ**: [GitHub CI 40696663182](https://github.com/Nicolas-Jakubik/stavebna-appka/actions/runs/40696663182). Test overuje aj zamestnancov, stavby, objekty, historické sadzby a cudzí kľúč. Nepovažovať za zálohu firmy.
- Browser/mobile testy: **NEOVERENÉ**
- Výplaty podľa reálnych záznamov: **NEOVERENÉ**; syntetický test **1 203 smien / 1 007 pracovníkov** cez autentifikované API prešiel, vrátane snapshot sadzieb, 30-min prestávky, súčtu a odmietnutia výpadku neskorej stránky ([CI 40691279585](https://github.com/Nicolas-Jakubik/stavebna-appka/actions/runs/40691279585))
- Metadata-only SQL check pre RPC/RLS/granty/trigger: **OVERENÉ čítaním pripojeného projektu**, nie potvrdenej produkcie; `scripts/verify-db-readiness.sql` + statické regresné testy.
- Test nad 1 000 riadkov v izolácii: **NEOVERENÉ**; syntetický test 1 203 riadkov cez klienta a API prešiel v [CI 40674286439](https://github.com/Nicolas-Jakubik/stavebna-appka/actions/runs/40674286439), ale test na izolovanej obnovenej DB stále chýba
- Väzba produkčného Vercelu na správny Supabase project: **NEOVERENÉ**
- Dashboard/Stavby/Pracovníci nad 1 000 záznamov: **KÓD OPRAVENÝ** vrátane včerajšieho zoznamu pracovníkov a filtrov (predtým skrátené na 1 000); regresný test pripravený, izolované integračné skúšky stále neoverené.
- Zapisovateľ a všetky zdroje financií nad 1 000 riadkov: **KÓD A CI HOTOVÉ; IZOLOVANÉ TESTY NEDOKONČENÉ**
- Výplaty: **PAGINÁCIA DOCHÁDZKY AJ ZOZNAMU PRACOVNÍKOV HOTOVÁ**, syntetické integrácie prešli; skutočný veľký dataset/porovnanie pôvodných výplat stále neoverené.
- Slovenské predvolené dátumy: **UPRAVENÉ** pre dashboard, nové stavby, výplaty a zapisovateľa, bez UTC posunu po polnoci; testy na prelom mesiaca/roka a DST doplnené. Skutočný mobilný/browser test ešte neprebehol.
- RPC `record_attendance_secure` na pripojenom projekte `MojaFiremnaApp`: **READ-ONLY METADÁTA OVERENÉ** (service_role áno, anon/authenticated nie, `objekt_id` podporované). **NAPOJENIE NA PRODUKČNÝ VERCEL NEOVERENÉ**.
- Vercel Preview: **READY nasadenie staršej opravnej vetvy nájdené; aktuálna revízia ani browser test NEOVERENÉ.** Produkčný `main` SHA a doména overené v metadátach; Supabase backend ref ešte nie.
- Duplicitné overlap triggery / drift migračnej histórie: **ZDOKUMENTOVANÉ, POTREBNÝ IZOLOVANÝ TEST**
- Súhlas s produkčným nasadením: **NEUDELENÝ**

Odovzdávací checkpoint: [REPAIR_HANDOFF.md](REPAIR_HANDOFF.md).
