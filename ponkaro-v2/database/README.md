# Oddelené cloudové ukladanie PONKARO

## Súčasný stav

Súpisy, ponuky a objednávky vo vývojovom prototype sú ukladané iba v lokálnom prehliadači. **Nie je to produkčné cloudové ukladanie.** Existujúce backendové odkazy a databázu aplikácie `sd-evidencia` nesmieme opakovane použiť.

## Návrh

1. Vytvoriť úplne nový Supabase projekt `PONKARO` (samostatný od projektu `MojaFiremnaApp`).
2. Uložiť migráciu `database/schema.sql`, zapnúť RLS a overiť oprávnenia podľa aktuálnych pravidiel Supabase Data API.
3. Pripraviť samostatné Vercel API s autentifikáciou používateľov a server-only kľúčom. Nikdy nevkladať service role key do JS prehliadača.
4. Doplniť prihlasovanie pre dve interné osoby, ochranu proti prihlasovacím útokom, CSRF a serverovú validáciu dokumentov.
5. Zmeniť front-end zo skúšobného `localStorage` na autorizované cloudové API. Pri migrácii zabezpečiť zálohu/export starých dokumentov.
6. Pridať testy: vytvoriť, načítať, upraviť, odstrániť, synchronizovať medzi dvoma zariadeniami, obnovenie zo zálohy.
7. Nasadiť na samostatný projekt `ponkaro` až po dokončení testov a overení prístupov.

## Poznámka k prístupu

Pripojený Vercel účet aktuálne odmietol vytvorenie nového projektu s HTTP 403. Z tohto dôvodu nič nedeplyujeme a nemeníme existujúce produkčné nastavenia.

## Poznámka k Supabase 2026

V roku 2026 je automatické sprístupňovanie tabuliek cez Data API obmedzené. Po migrácii overiť nastavenie Data API – samotné vytvorenie `public` tabuľky nestačí. Povoliť len serverový prístup s minimálnymi oprávneniami.

Tento dokument je technický plán. SQL nie je spustené, bezpečné API ani produkčné ukladanie ešte nie sú hotové.
