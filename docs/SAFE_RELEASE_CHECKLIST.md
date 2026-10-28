# FiremnáApka – bezpečný plán overenia a nasadenia (DRAFT)
**Identifikátor:** SD-EVIDENCIA-OPRAVY-2026-10-28  
**Súvisiaci kontrolný PR:** [#102](https://github.com/Nicolas-Jakubik/stavebna-appka/pull/102)  
**Stav k 28.10.2026:** 0 % opráv nasadených. Dokument je plán, nie povolenie nasadenia.

## Nevyhnutné STOP podmienky
- [ ] Dôveryhodný počítač a súkromné šifrované úložisko, kde budú uložené zálohy mimo verejného GitHubu, Vercelu a verejných CI artifactov.
- [ ] Prevedený **skutočný** `pg_dump` schémy `public` pomocou `scripts/backup-public-db.sh`; hash archívu bezpečne zapísaný do súkromného protokolu.
- [ ] `pg_restore` do **samostatnej neprodukčnej** PostgreSQL 17 databázy. Overené počty záznamov (najmä `dochadzka`), kontrolné súčty/základné kľúče, väzby a používateľsky dôležité výstupy. Samotné `pg_restore --list` nie je test obnovy.
- [ ] Zdokumentované, čo je mimo exportu: Supabase Auth, Storage súbory, projektové nastavenia, Vercel secrets. Ak sú potrebné pre prevádzku, samostatne zazálohovať a otestovať obnovu.
- [ ] Neprodukčné testovacie prostredie oddelené od produkcie (žiadne produkčné service-role kľúče v Preview). K 28.10.2026 pri projekte `MojaFiremnaApp` nebola nájdená Supabase vývojová databázová vetva.
- [ ] Vercel Preview `sd-evidencia` úspešne zostavený a prístupný: hlásenie `build-rate-limit` blokuje spoľahlivé overenie.
- [ ] Výsledky skúšok schválené, uložení odkazy na testy a potvrdený výslovný súhlas s nasadením.

## Testovacia matica v izolovanom prostredí
| Oblasť | Čo overiť | Kritérium |
| --- | --- | --- |
| Zapisovateľ | iPhone Safari, Android Chrome, desktop; nový prístupový odkaz; zotrvanie cookie po zavretí prehliadača podľa nastavenia | Prihlásený zapisovateľ zapisuje; anonymný používateľ nevidí/nezapisuje údaje |
| Administrátor | Prihlásenie, čítanie a editácia; samostatne otestovať tlačidlá mazania na testovacích riadkoch | GET/PATCH fungujú s oprávnením; DELETE bez presného `id=eq.<ID>` je odmietnuté |
| Dochádzka | Rozdelenie jednej smeny medzi stavby, duplicita/prekryv, dátumy a časy | Nedôjde k nechcenému prepísaniu údajov ani duplicitnému zápisu |
| Výplaty | Septembrové/októbrové pôvodné výpisy a snapshot sadzby; 1. a 2. polovica mesiaca; PDF | Kontrolné súčty sedia na pôvodné záznamy a sadzby platné pri zápise |
| Financie | Dataset s 1 184+ záznamami, presne 1 000 a prerušenie druhej stránky | Všetky riadky sú započítané; pri neúplnosti sa súčty **nezobrazia** |
| Základné operácie | Zoznam stavieb, pracovníkov, neprítomností, mobilné načítanie | Bez regresie, bez úpravy produkčných údajov |

## Pripravenosť na nasadenie – bez plánovanej odstávky
1. Vybrať pokojné obdobie mimo bežného zapisovania; rezervovať človeka, ktorý môže okamžite preveriť produkčný stav.
2. Vopred pripraviť jednoduché inštrukcie zapisovateľom: po zmene treba otvoriť **nový súkromný prístupový odkaz**. Nezverejňovať tokeny do GitHubu ani do verejných logov.
3. Skontrolovať zachovaný referenčný produkčný commit `8a2d40dfcfcd7d68557db7d2c6f94c6e99e5aa7d`, zálohu, Vercel predchádzajúce funkčné nasadenie a pravidlá obnovenia.
4. **Až po výslovnom povolení:** kontrolovane schváliť PR do `main`, overiť nový build a routovanie produkčnej domény.
5. Po deployi vykonať bezškodové kontroly: otvorenie a prihlásenie, prístupový odkaz zapisovateľa, čítanie aktuálnej dochádzky, výplatných/finančných súčtov. Produkčné „testovacie“ smeny nevytvárať.
6. Po prvých reálnych zápisoch overiť, či nespôsobujú chyby; oznámiť používateľom postup. **Bezodstávkový priebeh je cieľ, nie garancia** – nové prístupové pravidlá môžu zablokovať staré anonymné odkazy.

## Návratový postup (rollback)
- **Ak zlyhá autentifikácia, zápis, financie alebo build:** zastaviť ďalšie zmeny, obnoviť predchádzajúce funkčné Vercel nasadenie / verzovaný aplikačný commit až po kontrole dôsledkov a oprávnení.
- Návrat aplikácie **nie je návrat databázy**. Tieto PR neobsahujú databázovú migráciu; bežný rollback preto **nesmie** obnovovať starý dump nad živé údaje, lebo by mohol zmazať nové dochádzky.
- Ak by bolo potrebné obnovenie dát, vypracovať osobitný incidentný postup zachovania **všetkých zápisov vykonaných po zálohe** a vykonať ho iba so schválením.
- Každý incident zaznamenať (čas, verzia, dopad, spôsob nápravy); ponechať auditnú stopu.

## Záznam schválenia
- Záloha a hash: **NEOVERENÉ**
- Izolovaná obnova: **NEOVERENÉ**
- Browser/mobile testy: **NEOVERENÉ**
- Výplaty podľa reálnych záznamov: **NEOVERENÉ**
- Test nad 1 000 riadkov v izolácii: **NEOVERENÉ**
- Vercel Preview: **BLOKOVANÉ LIMITOM**
- Súhlas s produkčným nasadením: **NEUDELENÝ**

Odovzdávací checkpoint: [REPAIR_HANDOFF.md](REPAIR_HANDOFF.md).
