# SD Evidencia – read-only kontrola miezd a nasadenia, 1.11.2026

**Identifikátor:** SD-EVIDENCIA-OPRAVY-2026-10-28. Žiadna zmena údajov v produkčnej databáze.

## Metóda

- Zdroj: read-only SQL na súčasnej databáze `pfbgzwehfzgmsqjykvkb`, všetky dochádzky od 1.9. do 31.10.2026, prepojené s aktuálnym profilom pracovníka podľa mena.
- Pracovný čas: súčet skutočných časových intervalov, 30-min prestávka len raz na pracovníka/deň pri súčte nad 5,5 h. Prestávka sa priraďuje prevažne úseku cez poludnie podľa `lib/workHours.ts`. Posledný test ukázal, že všetky skúmané súčty sa dajú reprodukovať bez zmeny jediného záznamu.
- **Stará verzia výplat:** hodiny × aktuálna sadzba z profilu v `zamestnanci`; **nová verzia:** hodiny × `dochadzka.sadzba_snapshot` (ak snapshot chýba, fallback na aktuálny profil). Táto zmena musí byť potvrdená vlastníkom pre uzavreté obdobia.
- Súhrnné výsledky neuvádzajú osobné mená, individuálne sadzby ani údaje jednotlivých pracovníkov.

| Obdobie | Počet zápisov | Hodiny netto | Stará suma € | Nová suma € | Stará mínus nová € | Odlišné snapshoty |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1.–15.9.2026 | 96 | 901,00 | 9 267,50 | 9 267,50 | 0,00 | 0 |
| 16.–30.9.2026 | 104 | 1 062,50 | 10 959,25 | 10 892,00 | +67,25 | 13 |
| 1.–15.10.2026 | 96 | 989,50 | 10 203,00 | 10 171,50 | +31,50 | 6 |
| 16.–31.10.2026 | 97 | 998,50 | 10 304,00 | 10 304,00 | 0,00 | 0 |

Rozdiel **98,75 €** je výsledok dvoch spôsobov výpočtu; nepreukazuje dlžnú mzdu, skutočnú výplatu ani termín platnosti zmeny sadzby. Tento bod zostáva **MZDOVÝ STOP**.

## Ďalšie technické overenia

- 1.11.2026: databáza má 918 dochádzok; október má 193 zápisov, prvá polovica 96 a druhá 97; za november zatiaľ žiadny.
- 10 z 193 októbrových zápisov má čas mimo používateľom potvrdeného bežného rozvrhu (Po–Pia 07:00–18:00, sobota 07:00–17:00), **môže ísť o riadny nadčas**; automaticky ich neprepisovať ani nemaž.
- Neboli zistené presné duplicitné skupiny ani prekrývajúce sa intervaly v októbri podľa read-only výberu.
- Správny plánovaný fond október 2026 je 134,5 h (1.–15.) + 144 h (16.–31.).
- PR #102 podporuje opravu dátumu/stavby/času adminom, filtrovanie neobvyklých záznamov a otvorený recorder na pôvodnej URL bez novej aktivácie.
- Záloha public schémy z 1.11.2026 bola šifrovaná a izolovane obnovená na PostgreSQL 17 (918 dochádzok, 8 dokumentov, 12 tabuliek, 13 FK). Nevzťahuje sa na Auth/Storage.
- Najnovší PR kód zatiaľ **nie je** na produkčnej doméne ani na predchádzajúcom testovacom deploymente; ten je zo staršej revízie. Na prípravu bez prepnutia existuje `scripts/stage-safe-release.sh <full reviewed SHA>`.
- Admin login používa 350ms oneskorenie chybnej odpovede, nie distribuovaný limiter. Návrh ochrany vo `docs/ADMIN_LOGIN_WAF_PROPOSAL.md` zatiaľ nebol aktivovaný. Zachovať stabilný formulár na `/` a recorder API.
- **Pred promotion:** test najnovšieho build-u a PDF v prehliadači, odsúhlasiť správne historické sadzby, preveriť admin rate limit, zaistiť prednasadzovaciu zálohu (nové zápisy môžu pribudnúť), potvrdiť rollback a vlastníkovo povolenie prepnutia.
