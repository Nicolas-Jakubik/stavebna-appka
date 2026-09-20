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

## Zostávajúca databázová ochrana

Tento krok nemení SQL politiky. Verejná stránka zapisovania stále používa
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
