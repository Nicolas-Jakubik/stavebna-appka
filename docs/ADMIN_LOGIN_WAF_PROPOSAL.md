# SD Evidencia – ochrana admin login cez Vercel WAF (plán, nie nasadenie)

**Checkpoint:** SD-EVIDENCIA-OPRAVY-2026-10-28, aktualizované 1.11.2026.
**Stav:** NÁVRH – nezapnuté; neexistuje overené produkčné rate-limit pravidlo. Toto NIE JE povolenie meniť firewall bez samostatného schválenia.

## Správne mapovanie produkcie

- Vercel tím: `stavby-domysro` / `team_J51ayy2Um69GWfW8qecJI3wr`
- **Jeden reálny projekt**: pôvodne `stavebna-appka`, neskôr premenovaný na `sd-evidencia`, nemenné project ID `prj_OCqs3fyo3eQOqO4tuaI22PlUmWoh`. **Nie sú to dva nezávislé projekty.**
- Používaná doména: `stavebna-appka.vercel.app`; pri poslednom read-only overení stále smeruje na starú stabilnú verziu `dpl_xUKfxLsR8Fao8y1cNffhvPpgibnc`. Nemeniť doménu ani pracujúci formulár.
- Staršie tvrdenia v iných runbookoch, že `sd-evidencia` je len oddelená diagnostika a treba nastaviť WAF na iný projekt, sú **nesprávne**.

## Prečo a čo chrániť

Administrátorské `POST /api/admin/login` porovnáva spoločné heslo a chybný pokus umelo oneskorí o 350 ms. To **nie je** zdieľaný serverless rate limiter; automatizované pokusy treba obmedziť pred aplikáciou. Nesmie to zasiahnuť verejný formulár `/` ani `/api/recorder/*`. Viacerí chalani musia ďalej používať rovnaký odkaz bez účtov a nových hesiel.

## Navrhované pravidlo, zatiaľ NEAKTÍVNE

- Názov: `SD Admin Login — IP 10/min`
- IF: Request Path equals `/api/admin/login`; Request Method equals `POST` (ak UI filter metódy ponúka).
- THEN: Rate Limit **10 requestov / 60 sekúnd / IP**, fixed window, follow-up action Return 429 alebo Deny podľa aktuálneho UI.
- Jedna IP môže znamenať viac administrátorov za NAT; monitorovať falošné zablokovania. IP rotácia nie je týmto riešená.
- Vercel dokumentácia udáva na Hobby 1 pravidlo na projekt a 1 milión zahrnutých allowed requests; aktuálne kvóty/náklady treba skontrolovať pred aktiváciou.

## Bezpečný postup až po odsúhlasení

1. Otvoriť **existujúci** Vercel projekt `sd-evidencia` s uvedeným project ID. Vo `Firewall → Configure` skontrolovať existujúce pravidlá. Volanie `get_firewall_config(active)` vrátilo 404 `Seawall Config not found`, čo **NEDOKAZUJE** nulový počet pravidiel.
2. Pripraviť iba logovací režim podmienky pre presné `/api/admin/login`; podľa Vercel odporúčania aspoň 10 min pozorovať normálnu prevádzku. Nedávať pravidlo na celý web, `/api` ani `/api/recorder`.
3. Vlastník osobitne potvrdí aktiváciu obmedzenia. Následne `Review Changes → Publish` aplikuje produkčné pravidlo **okamžite**, bez code deployu.
4. Skontrolovať legitímny admin login a neovplyvnený otvorený recorder. Pri chybe vypnúť iba nové pravidlo, nie celú ochranu projektu.
5. Nezbierať reálne heslá, session cookies ani súkromné údaje do issue/commitu/logu.

Dokumentácia (aktuálne pravidlá Vercel):
- https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules
- https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- https://vercel.com/kb/guide/add-rate-limiting-vercel

**Release blocker:** finálne zabezpečenie admin login nie je potvrdené; rozhodnutie o odklade WAF alebo jeho zapnutí musí byť vedomé. Žiadna zmena firewallu zatiaľ nebola vykonaná.
