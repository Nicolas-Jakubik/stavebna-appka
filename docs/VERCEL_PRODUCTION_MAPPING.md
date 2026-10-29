# FiremnáApka – Vercel → Supabase: kontrola produkčného napojenia

**Kontrolný bod:** SD-EVIDENCIA-OPRAVY-2026-10-28. **Zatiaľ neoverené.** Tento dokument je návod na bezpečnú kontrolu, nie oprávnenie nasadiť PR #102.

## Posledné overenie 29.10.2026 – rozhodujúci výsledok

**Produkcia na Verceli je overená, produkčná databáza zostáva NEOVERENÁ.** Aktuálne produkčné metadáta: projekt `sd-evidencia` (`prj_OCqs3fyo3eQOqO4tuaI22PlUmWoh`), vetva `main`, git SHA `8a2d40dfcfcd7d68557db7d2c6f94c6e99e5aa7d`, stav `READY`. Draft PR #102 a produkcia sú oddelené. `NEXT_PUBLIC_SUPABASE_URL` má vo Verceli typ `sensitive` a ciele Production/Preview; dostupná metadátová odpoveď hodnotu neodhaľuje.

**Prečo nepokračovať v hľadaní vo verejnom HTML/JS:** skutočný klient zapisovateľa v `lib/recorderClient.ts` a admin klient v `lib/adminSupabase.ts` využívajú iba interné Next.js serverové trasy `/api/recorder/database/...` a `/api/admin/database/...` s fiktívnymi hostmi `recorder.invalid` / `admin.invalid`. Až serverové trasy čítajú `NEXT_PUBLIC_SUPABASE_URL` a service-role credentials. Preto z hlavnej verejnej obrazovky **nemožno spoľahlivo zistiť produkčný Supabase ref**. Existuje aj legacy súbor `lib/supabase.js`; nevyvodzovať z jednotlivých súborov úplné správanie všetkých obrazoviek.

Verejný statický výpis úvodnej stránky vrátil obsah zapisovateľa, ale bez Supabase hostname. Samostatný read-only browser pokus našiel len nekonzistentné 404 na skúšaných generických Next chunk cestách a nevrátil hostname. **Tieto 404 nepreukazujú produkčný výpadok**, nesúvisia s potvrdeným READY metadátovým stavom a nie sú dôvodom meniť nasadenie. Automatické prezeranie týmto **nepotvrdilo** backend; ďalšie rovnaké skúšanie nie je release gate.

**Jediný nutný bezpečný ľudský krok:** v existujúcom Vercel projekte `sd-evidencia` otvoriť `Settings → Environment Variables`, nastaviť filter **Production**, nájsť `NEXT_PUBLIC_SUPABASE_URL` a prečítať **len hostname** vo formáte `https://<PROJECT_REF>.supabase.co`. Porovnať samotný `PROJECT_REF` s pripojeným Supabase `MojaFiremnaApp` ref `pfbgzwehfzgmsqjykvkb`. Zapísať výsledok **zhoda / nezhoda / neviem zobraziť**. **Nezverejňovať ani nekopírovať kľúče, heslá, service-role values, tokeny ani celé env súbory.** Ak je iný ref, nezačínať zálohu z pripojeného projektu.

**Po zhode:** pripraviť iba súkromnú age šifrovanú zálohu tej istej DB na dôveryhodnom zariadení a jej kontrolnú obnovu do izolovaného prostredia; až potom test historických výplat a prehliadačov, následne výslovné schválenie release. **Žiadny krok tohto overenia neoprávňuje meniť live databázu alebo produkciu.**

## Čo sa podarilo zistiť cez pripojené nástroje

- Pripojený Vercel účet uvádza jeden tím s názvom **Stavby-DomySRO's projects**, tímové ID `team_J51ayy2Um69GWfW8qecJI3wr`.
- Zoznam projektov zobrazuje `sd-evidencia` s ID `prj_OCqs3fyo3eQOqO4tuaI22PlUmWoh`.
- Predchádzajúce čítanie detailu projektu s explicitným tímovým scoping-om vrátilo 404 a zoznam nasadení 403. **Aktuálne sú tieto metadátové požiadavky vyriešené cez ID projektu bez scoping-u; produkčnú verziu sme overili.**
- Prepojenie Vercel Git contexts nevrátilo žiadne linkedProjects; toto samo o sebe nie je dôkaz, že produkčný projekt Git integráciu nepoužíva.
- Pripojená Supabase databáza sa volá `MojaFiremnaApp`, projektový ref `pfbgzwehfzgmsqjykvkb`. Metadáta boli overené iba na čítanie. **Nie je dokázané, že produkčný Vercel používa tento ref.**

## Aktualizácia 28.10.2026 – Vercel čítanie vyriešené

**Nový výsledok:** Čítanie projektu a zoznamu nasadení sa podarilo **bez zadania `teamId` ani `slug`**, iba cez ID projektu `prj_OCqs3fyo3eQOqO4tuaI22PlUmWoh`. Predchádzajúce 404/403 pri explicitnom tímovom scoping-u nie sú dôkazom neprístupnosti projektu.

- **READY produkčné nasadenie**: projekt `sd-evidencia`, GitHub `Nicolas-Jakubik/stavebna-appka`, vetva `main`, commit `8a2d40dfcfcd7d68557db7d2c6f94c6e99e5aa7d` (pred opravami). Toto je metadátový stav nasadenia, nie vykonaný browser smoke test.
- **Potvrdená produkčná doména projektu:** `stavebna-appka.vercel.app`.
- **Preview aktualizované 29.10.2026:** `READY` zostavenie pre posledný **kódový commit** `fe141cf712d0682debe792e6a2281fd26d4bf1b8`, náhľad `sd-evidencia-izba68fhk-stavby-domysro.vercel.app` z `integration/safe-repairs-batch2-2026-10-28`. Následné zmeny dokumentácie vytvoria nový SHA a môžu dostať nový preview. **READY neznamená vykonané browser/mobile testy.** SSO ochrana je zapnutá pre ne-custom domény.
- **Výlučne metadáta nastavení:** Vercel potvrdzuje prítomnosť `NEXT_PUBLIC_SUPABASE_URL` pre Production/Preview a `SUPABASE_SERVICE_ROLE_KEY` len pre Production. URL premenná je označená `sensitive`; čítanie individuálnej konfigurácie **nevrátilo jej hodnotu**. **Preto nevieme potvrdiť, či je backendom `MojaFiremnaApp`**. Žiadny secret key ani dešifrované premenné sa nečítali/neposkytovali.
- **Zostávajúci presný krok:** v nastaveniach projektu manuálne pozrieť *iba* hostname/ref `NEXT_PUBLIC_SUPABASE_URL` v Production a porovnať s potvrdenou DB. Nezdieľať kľúče; nepresúvať ani nemenit deployment.

**STOP:** kým nie je potvrdený projektový ref a hotová skutočná obnoviteľná záloha, PR #102 nenasadzovať. Posledná pripravená verzia ostáva Draft; produkčný SHA `main` je zachovaný.

## Aktualizácia 29.10.2026 – pokus o minimálne overenie bez kľúčov

Prostredníctvom pripojeného Vercel nástroja bol čítaný **iba jednotlivý záznam** pre `NEXT_PUBLIC_SUPABASE_URL` (Production aj Preview). Výsledok obsahoval názov, ID a ciele premennej, ale **žiadnu hodnotu** (`decrypted=false`). Nepoužilo sa plošné dešifrovanie env premenných ani čítanie `SUPABASE_SERVICE_ROLE_KEY`, hesiel a ostatných tajomstiev. Preto **nie je možné z tohto výsledku dokázať**, že živá aplikácia používa pripojený projekt `MojaFiremnaApp` (`pfbgzwehfzgmsqjykvkb`). Nasadenie a zálohu skutočných údajov naďalej blokuje manuálne potvrdenie iba **verejného project ref** v nastaveniach Vercelu.

**Ďalší read-only pokus 29.10.2026:** verejná úvodná stránka `stavebna-appka.vercel.app` neposkytla v extrahovanom HTML identifikátor projektu Supabase; Gitom vytvorený Vercel deployment neposkytuje cez API zoznam zdrojových súborov (404). Nebolo získané nič, čo by spoľahlivo zodpovedalo pripojeniu v produkčnom behu. Preto **netvrdiť žiadnu zhodu projektu** len podľa stránky, GitHub kódu alebo existencie premenných. Manuálne porovnať **iba hostname/ref** cez Settings → Environment Variables, bez zdieľania tajných kľúčov.

## Bezpečná kontrola v používateľskom rozhraní Vercelu

1. Otvoriť Vercel Dashboard a vybrať tím **Stavby-DomySRO's projects**. V zozname projektov nájsť `sd-evidencia`. Ak projekt chýba alebo prístup nie je povolený, nezakladať ďalší projekt s rovnakým názvom, nepresúvať projekt a nemanipulovať s produkčnými doménami.
2. V detaile projektu preveriť **Settings → Git**: pripojené úložisko musí zodpovedať `Nicolas-Jakubik/stavebna-appka`; produkčná vetva musí zodpovedať očakávanej `main`. Odchýlky zaznamenať, nič neprepájať automaticky.
3. V **Deployments** zistiť posledné úspešné *Production* nasadenie a jeho commit SHA. Zaznamenať iba projektový názov, cieľ, SHA a stav, nie tokeny či obsah build logov s tajomstvami.
4. V **Settings → Environment Variables** preveriť, či existuje `NEXT_PUBLIC_SUPABASE_URL` pre prostredie *Production*. Porovnať **iba projektový ref (hostname)** s očakávaným Supabase projektom. **Nikdy nezobrazovať, nekopírovať ani nezdieľať** `SUPABASE_SERVICE_ROLE_KEY`, heslá, cookies či `.env` obsah. Pri rozdiele ref okamžite zastaviť prípravu zálohy a overiť správny zdroj.
5. **READY Preview na kódovom commite `fe141cf` je potvrdené v metadátach**. Otestovať jeho prístupnosť cez povolené SSO a konkrétne obrazovky na iPhone/Androide/desktope; tie sú **stále neoverené**. GitHub CI a READY build nie sú potvrdením správnosti prevádzky.
6. Ak chýba oprávnenie (napr. 403), skontrolovať členstvo a rolu v tíme alebo upraviť autorizáciu pripojenia **cez Vercel účet**, nie zdieľaním osobného tokenu v konverzácii. Nemeňte produkciu len kvôli opraveniu čítacích oprávnení.

## Povolené záznamy na odovzdanie

Bezpečne evidovať iba **názov projektu**, **team slug**, **produkčnú doménu**, **GitHub repo**, **production branch**, **verejný Supabase project ref**, **SHA produkčného commitu** a **stav nasadenia**. Nikdy neevidovať tajné kľúče, session cookies, kópie `.env`, databázové heslá alebo osobné údaje pracovníkov.

## STOP do potvrdenia

- Vercel produkčný deployment/commit **overený z metadát**; backendový Supabase ref je stále neznámy a nevieme bezpečne vybrať zdroj zálohy.
- Bez potvrdenia backendu **nespúšťať pg_dump proti predpokladanému Supabase projektu**.
- Nespájať PR #102 s `main`, nenasadzovať, nemenovať domény, nemeniť env variables a neaplikovať migrácie.
- Po overení napojenia pokračovať iba šifrovanou zálohou a nezávislou skúšobnou obnovou podľa `backup-and-restore-runbook.md`.
