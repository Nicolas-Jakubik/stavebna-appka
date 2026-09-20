# Serverový prístup administrácie – príprava na RLS

Admin stránky používajú `/api/admin/database/[table]`. Server pri každej
požiadavke overuje podpísanú admin cookie; zápisy navyše vyžadujú rovnaký
Origin. Povolené sú iba štyri existujúce aplikačné tabuľky v schéme public.
RPC, Auth, Storage ani ľubovoľné cieľové URL nie sú podporované.

## Pred nasadením

Vo Verceli nastavte `SUPABASE_SERVICE_ROLE_KEY` ako serverový Secret pre
Production. Musí patriť projektu z `NEXT_PUBLIC_SUPABASE_URL`. Kľúč sa nesmie
objaviť v `NEXT_PUBLIC_*`, zdrojovom kóde, logoch ani komentároch PR.
Bez neho endpoint vracia 503; úmyselne nepoužíva anonymný kľúč ako náhradu.
Preview potrebuje samostatnú bezpečnú konfiguráciu na testovacej databáze.

Po nasadení overte s platnou admin session čítanie a úpravy. Testy v repozitári
používajú iba falošné kľúče a mock databázu, nemenia produkčné dáta:

```sh
node --test tests/admin-database.test.cjs
npm run build
```

## Stav po predchádzajúcom nasadení PR #63

Predchádzajúci krok nemenil SQL politiky. Verejná stránka zapisovania stále používa
anonymný Supabase klient. Priame anonymné prístupy do databázy preto zostávajú
rizikom aj po presune administrácie na server.

Pred zapnutím RLS treba dokončiť prístup zapisovateľa (aktuálna hlavná stránka
nemá kontrolu tokenu odkazu), obmedziť dostupné údaje vrátane sadzieb a dôvodov
neprítomnosti a zabezpečiť zápis dochádzky. Následne odstrániť široké politiky
a anonymné UPDATE/DELETE oprávnenia. Samotné zapnutie RLS nestačí, pretože
existujú politiky USING(true), vrátane mazania dochádzky pre PUBLIC.

Databázové obmedzenia nasadiť až po úspešnom overení serverovej cesty.
Pri návrate na starý klientsky kód po obmedzení databázy by administrácia
prestala fungovať; neriešiť to opätovným verejným sprístupnením tabuliek.

## Súkromný zapisovateľ (nasledujúce nasadenie)

Nová hlavná stránka používa `/api/recorder/*`. Bez admin session alebo platného
odkazu nenačíta aplikačné dáta. Správca vytvorí odkaz tlačidlom „Odkaz pre
zapisovateľa“ v administrácii. Odkaz je prenositeľné oprávnenie platné 30 dní:
príjemca vidí mená pracovníkov, aktívne stavby a dochádzku (dotaz max. 31 dní),
nie sadzby ani dôvody neprítomnosti. Môže iba pridávať dochádzku pre existujúcich
pracovníkov na aktívnu stavbu; nemôže upravovať ani mazať záznamy.

Token je vo fragmente URL, server ho vymení za HttpOnly cookie a prehliadač
fragment odstráni. Odkaz posielajte iba oprávneným zapisovateľom. Nový odkaz
nezruší starý. Zmena ADMIN_PASSWORD a nové nasadenie zruší všetky doterajšie
odkazy aj admin session. Individuálne rušenie odkazu táto verzia neposkytuje.

Postup nasadenia:

1. Nainštalovať `recorder_server_function`. Na produkčnom projekte bola táto
   samostatná funkcia nainštalovaná 20. 9. 2026 pod verziou 20260920173140.
   Súbor v repozitári má rovnaké číslo ako vzdialená migrácia.
2. Zlúčiť a nasadiť aplikáciu. ADMIN_PASSWORD a SUPABASE_SERVICE_ROLE_KEY musia
   byť serverové Production Secrets. Preview vyžaduje vlastnú konfiguráciu.
3. Prihlásený správca overí administráciu a vytvorí súkromný odkaz. V samostatnom
   prehliadači overiť odkaz, načítanie stavieb/pracovníkov a zápis. Zapisovateľ
   nesmie dosiahnuť admin API; anonymný recorder endpoint musí vrátiť 401.
4. Až potom aplikovať `close_public_access_after_recorder`: zapne RLS, odstráni
   všetky staré politiky štyroch tabuliek a odoberie verejné tabuľkové aj sekvenčné
   oprávnenia. Service role zostane dostupná iba cez overené serverové API.
5. Overiť zamietnutie priameho anon SELECT/INSERT/UPDATE/DELETE, zachovanie
   serverových operácií a Supabase Security Advisor. Nevracať starého verejného
   klienta ani široké politiky pri prípadnej chybe; opraviť serverovú cestu.

Nespúšťať hromadné `db push` pred krokom 3. Obmedzujúca migrácia nie je súčasťou
Vercel buildu a samotné zlúčenie PR RLS neaktivuje.

Overenie tejto zmeny: `node --test tests/*.test.cjs` a `npm run build`.
Databázová funkcia bola overená v transakcii s ROLLBACK: nočná zmena, prekrývanie
na nasledujúci deň, nadväzujúci interval a atómové odmietnutie celej skupiny.
Testovacie záznamy nezostali uložené (sekvenčné ID sa môžu posunúť).
