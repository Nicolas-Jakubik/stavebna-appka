# SD Evidencia – mapovanie skutočnej prevádzky (aktualizácia 30.10.2026)

**Projekt:** SD-EVIDENCIA-OPRAVY-2026-10-28  
**Dôležité:** Živú aplikáciu, ktorú vlastník skutočne používa, **NEZAMIEŇAŤ** s diagnostickým projektom. Tento dokument je iba overovací podklad, nie povolenie na zmenu produkcie.

## Potvrdené adresy a nasadenia

| Úloha | Vercel projekt | Adresa | Nasadenie |
| --- | --- | --- | --- |
| **Skutočne používaná živá aplikácia (vlastník potvrdil 30.10.)** | `stavby-domysro/stavebna-appka` | `https://stavebna-appka.vercel.app/dashboard` | `dpl_xUKfxLsR8Fao8y1cNffhvPpgibnc`, vytvorené **22.10.2026 o 13:57 CEST**, READY, Production, pôvodný `main` / `8a2d40d` |
| Oddelené diagnostické nasadenie | `stavby-domysro/sd-evidencia` | `https://sd-evidencia-stavby-domysro.vercel.app` | `dpl_57wdDFxAMPsjTcXwM4dhFdHQqnEU`, READY, Production *environment* |

**Nezávislé kontrolné výpisy vlastníka z 30.10.2026:** `vercel inspect https://stavebna-appka-miujudv4j-stavby-domysro.vercel.app --scope stavby-domysro` uvádza aliasy `stavebna-appka.vercel.app`, `stavebna-appka-stavby-domysro.vercel.app`, `stavebna-appka-git-main-stavby-domysro.vercel.app`. `vercel alias ls --scope stavby-domysro` priraďuje `sd-evidencia-stavby-domysro.vercel.app` k diagnostickému nasadeniu, nie k pôvodnému aliasu. Používateľ výslovne potvrdil používanú URL s `/dashboard`.

**Dôsledok:** Diagnostické nasadenie *prevzalo alias projektu sd-evidencia*, ale **neexistuje dôkaz, že prepísalo adresu `stavebna-appka.vercel.app`**. Naopak, `vercel inspect` potvrdilo pôvodné aliasy na starom nasadení. **Nevykonávať rollback** bez ďalšieho dôvodu. Označenie `Production` pri nasadení projektu `sd-evidencia` nie je dôkaz, že ide o aplikáciu používanú firmou.

## Backend Supabase – čo je a nie je preukázané

- Existuje pripojený Supabase projekt `MojaFiremnaApp`, ref `pfbgzwehfzgmsqjykvkb`; prístupom cez lokálne TLS pripojenie bola overená existencia tabuľky `public.dochadzka`.
- Diagnostický endpoint na **novom oddelenom** nasadení `sd-evidencia` v prostredí Production vrátil po admin overení **`{"match":true}`** pre očakávaný Supabase host. To overuje *konfiguráciu tohto diagnostického behu*; **nie priamo pôvodný immutable runtime `stavebna-appka`**.
- Vercel `NEXT_PUBLIC_SUPABASE_URL` je klasifikovaná ako historická Sensitive/Secret premenná. Jej hodnotu nemožno zobraziť spätne cez Dashboard/API. **Nežiadať jej zverejnenie, neprepisovať env premenné kvôli kontrole**.
- **ZOSTÁVA STOP GATE:** priama väzba **živej `stavebna-appka.vercel.app` → konkrétny Supabase ref `pfbgzwehfzgmsqjykvkb`** nie je nezávisle potvrdená. Pred produkčným release ju treba potvrdiť bezpečným, osobitne odsúhlaseným postupom.

## Skutočná šifrovaná záloha a izolovaná obnova – potvrdené 30.10.2026

Používateľ na svojom dôveryhodnom MacBooku vykonal skutočný `pg_dump` projektu `pfbgzwehfzgmsqjykvkb`, šifrovaný cez `age` (iba schéma `public`). Overený archív bol **úspešne obnovený** do samostatného PostgreSQL 17 clusteru cez lokálny socket bez sieťového listenera. Overenie ukázalo:

- 12 tabuliek schémy `public`, 924 riadkov celkom (z nich 884 dochádzky), presná zhoda počtov riadkov v archíve a lokálnej obnove.
- 13 cudzích kľúčov, 0 nevalidovaných, 8 používateľských triggerov, 4 politiky a 5 funkcií.
- Lokálne bolo potrebné vytvoriť dve NOLOGIN roly `anon`/`authenticated`, schému `extensions` a rozšírenie `pgcrypto`. Nevytvárali sa v produkcii.
- Obnova je dôkazom obnoviteľnosti **tejto zálohy schémy public**, nie úplnej služby Supabase; nezahŕňa Auth, Storage objekty, systémové roly/ACL ani projektové secrets. Kontrola počtov a integrity základných DB objektov nie je nezávislé byte-for-byte porovnanie všetkých záznamov a nie je test prihlásenia či výplatnej logiky.
- **Pozor:** bez preukázanej väzby živého `stavebna-appka` deploymentu na tento Supabase ref **neoznačovať zálohu za overenú zálohu skutočne živej aplikácie**.

## Stav opráv / zákaz neautorizovaného nasadenia

- [Draft PR #102](https://github.com/Nicolas-Jakubik/stavebna-appka/pull/102) obsahuje pripravené opravy. CI aplikácie, syntetické PostgreSQL/RPC, šifrovanie a izolovaný browser smoke boli na HEAD `764b6e2` **5/5 úspešné**. Tieto testy nepokrývajú živé firemné mzdy ani skutočné mobilné zariadenia.
- **Žiadne opravné PR nebolo zlúčené do `main`** a opravy nie sú nasadené na používanej URL.
- Pred release: potvrdiť produkčné backend mapovanie, bezpečne overiť opravenú verziu a historické mzdy na izolovanej kópii, preveriť prístup zapisovateľov a rate limiting, pripraviť rollback, vyžiadať výslovný súhlas vlastníka.
- **Nerobiť:** `vercel deploy`, `vercel promote`, zmenu aliasov, editáciu produkčných env, migrácie alebo zápisy do produkčnej databázy len na základe tohto dokumentu.

## História opravy mapovania

Staršie texty v tomto repozitári označovali `sd-evidencia` ako projekt produkčnej domény `stavebna-appka.vercel.app`. Tento predpoklad bol **vyvrátený výpisom Vercel z 30.10.2026**; pri rozhodovaní má prednosť uvedené mapovanie rozlišujúce obidva projekty. Staged diagnostika nevytvorila zásah do pôvodných aliasov.
