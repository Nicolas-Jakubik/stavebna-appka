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

## Schválenie a bezpečný nástroj – kontrola 30.10.2026

Vlastník **schválil jednorazové staged Production nasadenie bez presmerovania domény**, nie bežné Production nasadenie, merge ani Promotion. Na pripojenom Vercel API konektore je možnosť vytvoriť Production deployment, ale **chýba prepínač `skip-domain` a nemožno zaručiť, že sa live aliasy nezmenia**. Podľa [Vercel CLI dokumentácie](https://vercel.com/docs/cli/deploy), [staged Production návodu](https://vercel.com/docs/cli/deploying-from-cli) a [auto-assign pravidiel](https://vercel.com/docs/cli/alias) sa preto nesmie použiť bežné `create_deployment(target=production)`. Je potrebný *overený* postup `vercel deploy --prod --skip-domain` cez CLI.

**Súčasný stav:** staging zatiaľ NIE JE vykonaný. Vercel spojenie pre tento ChatGPT relé nie je terminál používateľa a neposkytuje ekvivalent CLI `--skip-domain`. Prepojenie produkcie na Supabase je stále neoverené.

Pripravený príkazový súbor `scripts/stage-backend-match-without-alias.sh` je určený **len pre dôveryhodný počítač používateľa s existujúcim prihlásením do Vercel CLI**, nie do GitHub Actions ani do automatického PR hooku. Pred nasadením odmietne nevhodnú Git vetvu, iný commit ako dodaný úplný 40-znakový schválený SHA, neupratané súbory, nesprávny Vercel project/team ID či chýbajúcu podporu `--skip-domain`. Vyžaduje aj lokálne explicitné `SD_DIAGNOSTIC_STAGED_ONLY=APPROVED_NO_DOMAIN`. Samotný script spustí výhradne `vercel deploy --prod --skip-domain --yes --scope stavby-domysro`. **Nepoužíva ani nevypisuje produkčné secret hodnoty.**

Overenie a spustenie na lokálnom počítači:

1. Otvoriť aktuálnu diagnostickú Git vetvu `diagnostic/read-only-production-backend-match-2026-10-29`; **nepoužiť PR #102**. Počítač musí mať `git`, `node`, Vercel CLI, prepojenie na **existujúci** Vercel projekt a privátne prihlásenie do Vercelu (bez posielania hesla/tokenu do chatu).
2. V GitHub PR #103 overiť posledný HEAD, úspešné testy na **tom istom HEAD** a čistý checkout. Lokálny súbor `.vercel/project.json` sa musí zhodovať s `projectId=prj_OCqs3fyo3eQOqO4tuaI22PlUmWoh`, `orgId=team_J51ayy2Um69GWfW8qecJI3wr`. Pri nezhode neprelinkovať naslepo.
3. Zaznamenať, že živé `stavebna-appka.vercel.app` pred nasadením smeruje na referenčný deployment `dpl_xUKfxLsR8Fao8y1cNffhvPpgibnc` (`main` SHA `8a2d40d`). Pred spustením treba tento stav ešte raz načítať.
4. **Len s potvrdeným schváleným HEAD SHA**, v koreňovom priečinku čistej diagnostickej vetvy spustiť:

   ```bash
   SD_DIAGNOSTIC_STAGED_ONLY=APPROVED_NO_DOMAIN \
     bash scripts/stage-backend-match-without-alias.sh '40_ZNAKOVY_KONTROLOVANY_SHA'
   ```

   Zástupný SHA sa nesmie použiť doslova. Script musí po overení vypísať URL nového staged deploymentu; nikdy nespúšťať `vercel promote` ani plain `vercel --prod`.
5. Skontrolovať cez Vercel API/dashboard, že **všetky tri existujúce live aliasy zostali na pôvodnom deployment ID**. Pri akejkoľvek odchýlke STOP, neodpovedať testom a riešiť incident podľa predchádzajúceho nasadenia.
6. Pre novo vytvorenú, Vercel Authentication chránenú staged URL sa vlastník súkromne prihlási do existujúcej administrácie a otvorí `/api/admin/backend-match` na tom istom hoste. Zaznamenať výhradne `match:true` alebo `match:false` (alebo chybový stav). **Neodosielať heslo, session cookie ani env.**
7. Po kontrole nepromovať diagnostiku. Bez ďalšieho schválenia nepripájať alias, nemergovať, nemeniť env a nespúšťať skutočný dump.

**Význam výsledku:** staged Production v novom deploymente overuje aktuálne pripojenie novo zostaveného deploymentu s Production env; **nemusí byť nezávislým dôkazom pôvodných env hodnôt existujúceho live deploymentu**, ktorého identitu treba naďalej overiť pred zálohou. Neoznačiť databázový release gate za dokončený len z tejto zhody.

## Bezpečný postup a rozhodovacie body

1. Tento **samostatný** diagnostický PR vytvoriť vo vetve od produkčného referenčného commitu `8a2d40d`; nemiešať s rozsiahlym PR #102.
2. Zopakovať CI (unit, typecheck, build), otestovať 401, 200 true/false, 503, no-store, nulové DB požiadavky, žiadne tajomstvá vo výsledku. **Iba testovacie env hodnoty.**
3. **STOP a osobitný výslovný súhlas vlastníka pred akýmkoľvek nasadením v Production prostredí**, aj keď sa použije bezpečný režim staged Production s `--skip-domain`. Pred nasadením overiť exact Git SHA, tím/projekt, scope env, ochranu prístupu a návratový postup.
4. Preferovať **staged Production deployment bez priradenia živej domény**, iba ak Vercel plán a oprávnenia túto možnosť umožnia, a ak je URL chránená pred verejnosťou. Taký deployment by čítal Production env, ale nepresmeroval by existujúcu doménu. Ak to nie je možné, neimprovizovať: pred merge/Promotion do `main` sa vyžaduje ďalší osobitný súhlas a kontrola rizika.
5. Do chráneného staged deploymentu sa prihlásiť cez existujúcu admin obrazovku, potom otvoriť `/api/admin/backend-match` **na tom istom hoste**. Reportovať len `match:true/false`, nie cookies, URL tajomstiev ani heslo. Rozlišovať medzi staging Production env aktuálnej konfigurácie a starým immutable Production nasadením; prvé automaticky **nepreukazuje** historickú konfiguráciu druhého.
6. Iba pri spoľahlivej identifikácii **aktuálne aktívneho Production backendu** pristúpiť k citlivej zálohe, šifrovanému exportu a izolovanej obnove. Staged výsledok sám osebe nie je schválením backupu starého aktívneho Production deploymentu.
7. Diagnostický endpoint po overení odstrániť v samostatne schválenom kroku; neuchovávať dlhodobo bez potreby.

**Nedovolené:** produkčný deploy alebo merge bez výslovného súhlasu; menenie existujúcej skrytej env hodnoty kvôli čítaniu; používanie Production kľúčov v nedôveryhodnom Preview; prístup k firemným dátam; reálne testovacie zápisy; publikovanie autentifikačných cookies či `.env`; predstieranie, že Preview env je Production alebo že staged Production dokazuje staré historické nasadenie.
