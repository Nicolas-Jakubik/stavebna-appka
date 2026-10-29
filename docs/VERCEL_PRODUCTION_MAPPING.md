# SD Evidencia – overenie väzby produkčného Vercelu na správny Supabase

**Projekt:** SD-EVIDENCIA-OPRAVY-2026-10-28  
**Stav:** NEOVERENÉ – STOP pred skutočnou produkčnou zálohou aj pred nasadením PR #102.  
**Aktualizácia:** 29.10.2026; predchádzajúce neuskutočniteľné pokyny nahradené týmto dokumentom.

## Čo je preukázané (bez produkčných zásahov)

| Otázka | Výsledok |
| --- | --- |
| Vercel projekt | `sd-evidencia`, ID `prj_OCqs3fyo3eQOqO4tuaI22PlUmWoh` |
| Produkčná doména | `stavebna-appka.vercel.app` |
| GitHub zdroj | `Nicolas-Jakubik/stavebna-appka`, `main` |
| Posledné overené Production nasadenie | READY, commit `8a2d40dfcfcd7d68557db7d2c6f94c6e99e5aa7d` |
| Opravný PR | #102, stále DRAFT, bez merge na `main` |
| Vercel env metadáta | `NEXT_PUBLIC_SUPABASE_URL` existuje pre Production/Preview; typ `sensitive` a `decrypted=false` |
| Pripojený Supabase | `MojaFiremnaApp`, project ref `pfbgzwehfzgmsqjykvkb`, ACTIVE_HEALTHY |
| Väzba Production → tento konkrétny Supabase ref | **NEPOTVRDENÁ** |

Konzistentné staršie projektové záznamy spájajú FiremnúApku so Supabase `MojaFiremnaApp`, **ale nejde o nezávislý dôkaz hodnoty historického Vercel Production deployment environmentu**. Nekombinovať nepriamo súvisiace indície do tvrdenia o potvrdenej zhode.

## Prečo Vercel Settings/API nemôže poskytnúť odpoveď

Vercel 24.08.2026 preklasifikoval existujúce *Sensitive* env premenné na *Secret*. Takéto hodnoty sú **po uložení write-only**, v Dashboarde ani cez Vercel API sa nedajú znova zobraziť; nasadený program ich naďalej môže čítať. Metadátové volania `get_project_env` a `filter_project_envs(decrypt=true)` vrátili iba `decrypted=false`, bez URL.

- [Oficiálny Vercel changelog](https://vercel.com/changelog/environment-variables-now-use-config-and-secret-types)
- [Oficiálna dokumentácia Sensitive env](https://vercel.com/docs/environment-variables/sensitive-environment-variables)
- [Dôležité: env zmeny sa spätne neaplikujú na staré deploymenty](https://vercel.com/docs/environment-variables)

**Nežiadať používateľa otvárať tajnú hodnotu v Settings alebo posielať .env. Nikdy nemeniť ani nahrádzať túto premennú iba na overenie adresy; zmena konfigurácie pre nové nasadenia nemusí dokazovať nastavenie starého Production deploymentu.**

## Už vyskúšané read-only možnosti

1. Vercel projekt, produkčné nasadenie a metadáta env: skontrolované; URL nedostupná.
2. GitHub `main`: `lib/supabase.js`, `lib/recorderClient.ts`, `lib/adminSupabase.ts`, `app/api/recorder/database/[table]/route.ts` – nie je tam priamo zapísaný Supabase hostname. Admin/recorder klienti komunikujú cez same-origin serverové API.
3. Verejná domovská stránka načítaná read-only browserom. Z HTML extrakcie nebolo možné získať reálne použité JS súbory (`script[src]` počet 0), teda **žiadna zhoda ani nezhoda** hostname sa nepreukázala. V minulosti skúšané odhadnuté chunk URL vrátili 404, ktoré **nedokazujú chybu aplikácie**. Rovnaké skúšanie neopakovať.
4. CI testy a Vercel READY sú dôkazom zostavenia/testov syntetických dát, **nie** väzby na firemnú databázu.
5. Preview má vlastný env kontext a nemusí dostať Production-only service-role credentials. **Preview zhoda by nedokazovala konfiguráciu existujúceho Production deploymentu.**

## Ďalší legitímny postup – bez zmeny živej aplikácie

- Hľadať existujúcu dôveryhodnú **netechnickú dôkazovú stopu** pôvodného nasadenia: predchádzajúci bezpečný interný záznam project ref, verifikované deployment/config poznámky alebo správu prevádzkovateľa s presným ref. Nikdy nie kľúč, cookie, heslo alebo URL obsahujúce prihlasovacie údaje. Tento dôkaz musí byť pre ten istý nasadený Production deployment, inak ide iba o indíciu.
- Ak spoľahlivá stopa neexistuje, **zastaviť identifikačný gate** a pripraviť osobitný minimálny diagnostický návrh pre čítanie identity **v skutočnom Production runtime**, ktorý by vracal výhradne `zhoda / nezhoda`, nemal verejný endpoint ani prístup k firemným riadkom. Jeho spustenie/deployment je **produkčná zmena**, a vyžaduje osobitné bezpečnostné posúdenie, plán návratu a **výslovný súhlas vlastníka**. Bez toho nič nespúšťať.
- Produkčný `main`, domény, env premenné, heslá, Firewall, Supabase ani firemné záznamy sa nesmú modifikovať automaticky. Nevykonávať akékoľvek migrácie alebo skúšobné dochádzkové zápisy.

## STOP / nadväzné uvoľnenie

1. Preukázať **presnú** identitu backendu produkčného deploymentu, nie iba názov spojeného projektu.
2. Až potom na dôveryhodnom zariadení vytvoriť súkromnú **age-šifrovanú zálohu potvrdenej databázy**, podľa [backup-and-restore-runbook.md](backup-and-restore-runbook.md), bez zverejnenia prístupových údajov.
3. Skutočný dump obnoviť do **oddeleného** PostgreSQL a overiť počty, checksumy, väzby, RPC, historické výplaty a úplnosť stránkovania. Syntetická PG17 obnova nie je plnohodnotná náhrada.
4. Otestovať zariadenia/mobile/desktop a až nakoniec vyžiadať samostatné schválenie release. Pripravený postup: [SAFE_RELEASE_CHECKLIST.md](SAFE_RELEASE_CHECKLIST.md).

**Žiadna z uvedených read-only kontrol nie je povolením mergovať PR #102 či meniť produkciu.**
