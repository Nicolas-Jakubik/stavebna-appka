# SD Evidencia — oddelené testovanie a prístup bez rizika pre živé dáta

**Stav 1. 11. 2026: PR #104, IBA TESTOVACIA VETVA, NIE PRODUKCIA.**

## Čo bolo overené
- Vercel projekt: `sd-evidencia` (ID `prj_OCqs3fyo3eQOqO4tuaI22PlUmWoh`).
- `ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY` a `RECORDER_SESSION_SECRET` sú v konfigurácii Vercelu viazané len na **production**, nie na **preview**.
- `NEXT_PUBLIC_SUPABASE_URL` a `NEXT_PUBLIC_SUPABASE_ANON_KEY` sú aktuálne dostupné v oboch prostrediach; hodnoty sme zámerne nedešifrovali ani neskopírovali.
- Samostatný projekt `MojaFiremnaApp` (ref `pfbgzwehfzgmsqjykvkb`) existuje; v čase kontroly nemal vytvorenú Supabase development branch. Toto **nepotvrdzuje** immutable backend pôvodnej verejnej URL.
- Preto nie je platné tvrdiť, že testovací dashboard je pripravený na bezpečné zapisovanie hodín. Bez serverového hesla by login správne vrátil 503. Verejné `/design-preview/*` sú iba statické koncepty so syntetickými údajmi.
- Vercel Hobby môže obmedziť rýchlosť buildov; posledné zostavenia po rozsiahlejšej sérii commitov môžu mať `build-rate-limit`. Najprv kontrolovať GitHub CI, potom Vercel READY; nikdy nezamieňať úspešné CI za hotové nasadenie.

## Ochrana testovacej databázy (PR #104)
`lib/previewDatabaseIsolation.ts` blokuje databázové pripojenie na serveri, ak `VERCEL_ENV=preview` a neexistuje bezpečne oddelená testovacia konfigurácia.

Zablokované sú:
- všetky požiadavky administrátorského databázového API (`GET/POST/PATCH/DELETE`);
- všetky čítania aj zápisy cez recorder API (`GET/POST`);
- vytvorenie privilegovaného klienta `serverDatabase()` z ďalších serverových ciest.

V testovacom prostredí zostanú tieto API blokované **aj v prípade, že by niekto omylom nastavil produkčný servisný kľúč**, pokiaľ nie sú splnené všetky podmienky:
1. Existuje samostatný, **nový** Supabase projekt alebo izolovaná DB vetva s jedinečným ref.
2. Server-only `SD_EVIDENCIA_STAGING_DB_REF` presne zodpovedá ref testovacej databázy (20 alfanumerických znakov).
3. `NEXT_PUBLIC_SUPABASE_URL` presne ukazuje na `https://<ref>.supabase.co` tohto testovacieho projektu.
4. Ref sa nezhoduje so známym projektom MojaFiremnaApp. Pred povolením testov je **povinné ručne overiť**, že zvolená testovacia DB nepatrí ani inej produkčnej aplikácii a obsahuje iba syntetické údaje. Súčasne treba potvrdiť backend skutočnej produkčnej URL.

Podmienky sa overujú na serveri, nestačí obísť UI v prehliadači.

## Bezplatná kontrola dizajnu bez databázy (na počítači)

Bez Supabase Pro a bez akejkoľvek produkčnej konfigurácie:
1. Vytvor **novú čistú pracovnú kópiu** repozitára z testovacej vetvy `design/apple-style-navigation-2026-11-01` (nie produkčnú inštaláciu).
2. Nespúšťaj žiadne ručné zápisy. Uisti sa, že v koreňovom priečinku nie je `.env*` súbor; nenechávaj tam produkčné kľúče.
3. Spusti `npm ci --no-audit --no-fund`, následne `npm run demo:safe`.
4. Otvor `http://localhost:3001/design-preview` a prechádzaj **Dochádzka, Výplaty, Stavby, Pracovníci, Financie**. Pre lokálne zobrazenie na iPhone je potrebné overené interné sieťové spojenie a bezpečný spôsob prístupu; nepúšťať port verejne do internetu.
5. `demo:safe` odmietne štart, ak je v kópii prítomný akýkoľvek lokálny `.env` súbor. Navyše vymaže zo zdedeného procesu databázové a administračné premenné, nastaví `VERCEL_ENV=preview` a odkáže na neexistujúcu doménu databázy. Serverový preview guard odmieta databázové požiadavky, pretože chýba platná staging DB identita.
6. Toto je **iba kontrola vzhľadu a responzivity**. Neskúša skutočné API, formuláre ani PDF. Na tie je potrebná oddelená databáza a funkčný testovací login.

**Bezpečnostné obmedzenie:** pri spúšťaní nenechávaj Next.js otvorený do internetu a nikdy do ukážky nezadávaj reálne údaje pracovníkov. Konzervatívny lokálny launcher nie je náhradou za izolovaný funkčný test.

## Čo treba dokončiť pred zapnutím funkčného testu
1. **Výber oddelenej databázy a potvrdenie ceny.** Pri vytvorení nového Supabase projektu alebo development branch najprv overiť aktuálnu cenu; bez výslovného súhlasu vlastníka nevytvárať platený zdroj.
2. **Pripraviť schému na testovacej DB** z overených migrácií alebo schéma-only exportu. Nikdy neprenášať živú dochádzku, skutočné mzdy, mená ani súkromné kľúče. Testovacie údaje generovať synteticky.
3. **Vo Verceli rozdeliť premenné podľa prostredia**: existujúcu `NEXT_PUBLIC_SUPABASE_URL` so spoločným targetom production+preview zmeniť tak, aby produkčná hodnota ostala iba production; pre preview vytvoriť **samostatnú testovaciu** URL. Neprepisovať produkčné hodnoty plošne.
4. **Iba Preview:** nastaviť samostatné silné `ADMIN_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY` výlučne z testovacej DB a server-only `SD_EVIDENCIA_STAGING_DB_REF`. Nedávať servisný kľúč do `NEXT_PUBLIC_*` ani GitHubu.
5. **Otestovať** nesprávne/správne heslo, admin session, čítanie/pagináciu, vytvorenie/úpravu jedného fiktívneho zápisu, opravu omylu, duplicity, filtre stavieb/pracovníkov, dve polovice miezd, historickú sadzbu a PDF/tlač v Chrome/Safari/na iPhone. Overiť, že produkčná databáza nebola kontaktovaná.
6. **Potvrdiť bezpečnosť:** správny projekt/team, ref testovacej DB, prístup len pre interných testerov, RLS na exposed tabuľkách, nulový prenos produkčných osobných dát. Pre produkciu platia aj všetky STOP podmienky PR #102.

## Nezmeniť v produkcii
- Žiadne zmazanie, zmena Supabase produkčných tabuliek ani rotácia existujúcich hesiel.
- Žiadny merge `main`/promote/production nasadenie bez testov a schválenia vlastníka.
- Zapisovatelia používajú stále `https://stavebna-appka.vercel.app/` bez ďalších úkonov; tento workflow je nadradený starým experimentálnym textom o aktivácii zariadení.
- Skutočné PDF a výplaty sa porovnávajú až v bezpečnom izolovanom prostredí.

## Kontrolný zoznam pre pokračovanie v novom chate
Repo `Nicolas-Jakubik/stavebna-appka`, PR #104 nad `integration/safe-repairs-batch2-2026-10-28`, staging preview URL v PR komentároch. Pri začatí skontrolovať Vercel build rate limit a GitHub CI; potom až po výslovnom rozhodnutí o nákladoch zriadiť oddelené testovacie prostredie.
