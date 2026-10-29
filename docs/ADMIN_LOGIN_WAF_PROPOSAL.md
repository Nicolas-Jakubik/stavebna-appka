# SD Evidencia – návrh ochrany prihlasovania cez Vercel WAF

**Kontrolný bod:** SD-EVIDENCIA-OPRAVY-2026-10-28
**Stav:** NÁVRH / NIČ NEZAPNUTÉ. Tento dokument **nie je povolenie na úpravu produkčného Firewallu**.
**Zodpovedný projekt:** Vercel `sd-evidencia` (`prj_OCqs3fyo3eQOqO4tuaI22PlUmWoh`), produkčná doména `stavebna-appka.vercel.app`.
**Zdroj:** oficiálna dokumentácia Vercel WAF (2025–2026):
- https://vercel.com/kb/guide/limit-abuse-with-rate-limiting
- https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules

## Prečo je to potrebné

`app/api/admin/login/route.ts` používa spoločné administračné heslo. Zlé heslo vytvorí oneskorenie asi 350 ms; **nejde o globálny, trvalý ani distribuovaný rate limiter**. Vercel prevádzkuje serverless inštancie a procesová pamäť nefunguje ako spoľahlivá spoločná počítadlová databáza.

WAF umožňuje vynucovať limit ešte pred vstupom do Next.js API, nezávisle od ďalšej databázovej migrácie alebo hesiel.

## Návrh konkrétneho pravidla (ZATIAĽ NEAKTÍVNE)

- **Názov:** `SD Admin Login – IP 10/min`.
- **If – Request Path:** `Equals` `/api/admin/login`.
- **If – Request Method:** `Equals` `POST`, ak je filter metódy v aktuálnom UI dostupný. Inak použiť výlučne presnú cestu (nie `/api` alebo `/`).
- **Then – Rate Limit:** fixed window, **10 požiadaviek za 60 sekúnd**, kľúč **IP Address**.
- **When exceeded:** `Deny` podľa oficiálneho návodu; HTTP 429 je vhodná možnosť len ak ju UI umožňuje a je otestovaná.
- **Výnimky:** Neobmedzovať `/api/recorder/*`, samotný formulár, dochádzku, PDF ani iné URL.
- **Účinnosť:** WAF obmedzuje **všetky login POST**, nie iba nesprávne heslá. Za firemným NAT môže jedna IP reprezentovať viac administrátorov; limit treba prispôsobiť meranej návštevnosti. Rotačné IP a distribuované útoky nie sú týmto pravidlom úplne vyriešené.
- **Náklady:** podľa oficiálnej dokumentácie je WAF Rate Limiting dostupný na všetkých Vercel plánoch; pred aktiváciou si treba overiť aktuálny cenník, dostupné kvóty a upozornenie Vercelu. Žiadne platby ani nastavenia neboli menené.

## Bezpečný postup až po výslovnom schválení

1. Overiť správny **existujúci** Vercel tím a projekt. Preveriť existujúce pravidlá v `Firewall → Configure` a zistiť, či už login nie je chránený alebo sú limity plánu vyčerpané. Pripojené read-only volanie na `get_firewall_config(active)` vrátilo `404 Seawall Config not found`; **to nepreukazuje neprítomnosť pravidiel ani správnu konfiguráciu**.
2. Vytvoriť **len logovací náhľad** pravidla s presnou cestou `/api/admin/login`; pozorovať približne **10 minút** bežnej prevádzky bez generovania množstva neúspešných loginov alebo skúšania skutočného hesla. Pri nejasnej návštevnosti radšej predĺžiť sledovanie.
3. Skontrolovať, že podmienka zachytáva iba prihlásenie, nie bežné zápisy pracovníkov. Ak áno a vlastník schváli, prepnúť akciu na Rate Limit 10/60s/IP s Deny a potvrdiť `Review Changes → Publish`. Pravidlo začne ovplyvňovať živú prevádzku **okamžite**, bez code deployu; preto je to produkčná zmena, ktorá vyžaduje súhlas.
4. Overiť v rámci povoleného interného testu, že jedna legitímna administrátorská relácia funguje a zapisovateľ môže zapisovať. Záznamy o prihlasovaní, heslá ani cookies neposielať do GitHubu či konverzácie.
5. Ak dôjde k nesprávnemu blokovaniu, **vypnúť len toto nové pravidlo** alebo vrátiť predchádzajúcu známu konfiguráciu z Firewall audit logu. Neupravovať iné pravidlá.

## Čo tento návrh **NEDOKAZUJE**

- Nie je aktivovaný ani overený nijaký produkčný WAF limit.
- Neoveruje samotný Supabase production ref ani skutočnú obnovu dát.
- Nie je to plnohodnotná ochrana pred útočníkmi, ktorí menia IP adresy.
- Aktuálna live aplikácia beží na `main` SHA `8a2d40d`, nie na opravnom PR #102.

**STOP pred produkčným merge/deploy:** potvrdiť databázový ref, reálnu šifrovanú zálohu a izolovaný restore, reálne výplaty, browser/mobile E2E a výslovný súhlas.
