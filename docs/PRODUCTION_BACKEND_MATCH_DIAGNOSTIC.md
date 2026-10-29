# FiremnáApka: izolovaná kontrola Production → Supabase (samostatný návrh)

**Stav:** DRAFT – iba návrh diagnostického PR. NIE JE schválením deploymentu.  
**Prečo:** Záložný release gate PR #102 je blokovaný, pretože `NEXT_PUBLIC_SUPABASE_URL` je na Verceli skrytá `Sensitive/Secret` premenná (nedá sa spätne čítať cez Settings/API). Firemné dáta sa nesmú zálohovať z neoverenej databázy.

## Presný rozsah tohto návrhu

- Jediná nová API cesta: `GET /api/admin/backend-match`.
- Overuje existujúcu **platnú serverovú admin session cookie** na každej požiadavke; anonymne vracia len HTTP 401.
- V aktuálnom serverovom runtime prečíta `NEXT_PUBLIC_SUPABASE_URL` a **lokálne porovná jej URL hostname** so zamýšľaným Supabase ref `pfbgzwehfzgmsqjykvkb`.
- Adminovi vráti iba `{"match":true}` alebo `{"match":false}`; pri chýbajúcom/neplatnom env len 503 bez pôvodnej URL. Neposkytuje žiadne heslá, service-role kľúč, ďalšie hodnoty environmentu, tabuľky, záznamy, počet pracovníkov ani výplatné údaje.
- Odpoveď je `Cache-Control: private, no-store`, `Vary: Cookie`; bez CORS a bez public discovery stránky.
- Diagnostika **nikdy nekontaktuje Supabase** a nepíše do databázy. Výsledok `match:true` potvrdzuje **hostname nakonfigurovaný pre daný deployment**, nie kvalitu backupu ani funkčnosť reálnych DB operácií.
- Pozor: audit aktuálnej `main` vetvy potvrdil existenciu `lib/adminSession.ts` a použiteľné serverové overenie admin session. Bez admin loginu nie je endpoint čitateľný.

## Bezpečný postup a rozhodovacie body

1. Tento **samostatný** diagnostický PR vytvoriť vo vetve od produkčného referenčného commitu `8a2d40d`; nemiešať s rozsiahlym PR #102.
2. Zopakovať CI (unit, typecheck, build), otestovať 401, 200 true/false, 503, no-store, nulové DB požiadavky, žiadne tajomstvá vo výsledku. **Iba testovacie env hodnoty.**
3. **STOP a osobitný výslovný súhlas vlastníka pred akýmkoľvek nasadením v Production prostredí**, aj keď sa použije bezpečný režim staged Production s `--skip-domain`. Pred nasadením overiť exact Git SHA, tím/projekt, scope env, ochranu prístupu a návratový postup.
4. Preferovať **staged Production deployment bez priradenia živej domény**, iba ak Vercel plán a oprávnenia túto možnosť umožnia, a ak je URL chránená pred verejnosťou. Taký deployment by čítal Production env, ale nepresmeroval by existujúcu doménu. Ak to nie je možné, neimprovizovať: pred merge/Promotion do `main` sa vyžaduje ďalší osobitný súhlas a kontrola rizika.
5. Do chráneného staged deploymentu sa prihlásiť cez existujúcu admin obrazovku, potom otvoriť `/api/admin/backend-match` **na tom istom hoste**. Reportovať len `match:true/false`, nie cookies, URL tajomstiev ani heslo. Rozlišovať medzi staging Production env aktuálnej konfigurácie a starým immutable Production nasadením; prvé automaticky **nepreukazuje** historickú konfiguráciu druhého.
6. Iba pri spoľahlivej identifikácii **aktuálne aktívneho Production backendu** pristúpiť k citlivej zálohe, šifrovanému exportu a izolovanej obnove. Staged výsledok sám osebe nie je schválením backupu starého aktívneho Production deploymentu.
7. Diagnostický endpoint po overení odstrániť v samostatne schválenom kroku; neuchovávať dlhodobo bez potreby.

**Nedovolené:** produkčný deploy alebo merge bez výslovného súhlasu; menenie existujúcej skrytej env hodnoty kvôli čítaniu; používanie Production kľúčov v nedôveryhodnom Preview; prístup k firemným dátam; reálne testovacie zápisy; publikovanie autentifikačných cookies či `.env`; predstieranie, že Preview env je Production alebo že staged Production dokazuje staré historické nasadenie.
