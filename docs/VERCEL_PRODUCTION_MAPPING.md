# FiremnáApka – Vercel → Supabase: kontrola produkčného napojenia

**Kontrolný bod:** SD-EVIDENCIA-OPRAVY-2026-10-28. **Zatiaľ neoverené.** Tento dokument je návod na bezpečnú kontrolu, nie oprávnenie nasadiť PR #102.

## Čo sa podarilo zistiť cez pripojené nástroje

- Pripojený Vercel účet uvádza jeden tím s názvom **Stavby-DomySRO's projects**, tímové ID `team_J51ayy2Um69GWfW8qecJI3wr`.
- Zoznam projektov zobrazuje `sd-evidencia` s ID `prj_OCqs3fyo3eQOqO4tuaI22PlUmWoh`.
- **Čítanie detailu projektu vrátilo 404** a **zoznam nasadení 403 (forbidden)**. Ani dostupnosť názvu projektu v zozname nie je dôkazom, že vidíme produkčné nasadenie či jeho environment variables.
- Prepojenie Vercel Git contexts nevrátilo žiadne linkedProjects; toto samo o sebe nie je dôkaz, že produkčný projekt Git integráciu nepoužíva.
- Pripojená Supabase databáza sa volá `MojaFiremnaApp`, projektový ref `pfbgzwehfzgmsqjykvkb`. Metadáta boli overené iba na čítanie. **Nie je dokázané, že produkčný Vercel používa tento ref.**

## Bezpečná kontrola v používateľskom rozhraní Vercelu

1. Otvoriť Vercel Dashboard a vybrať tím **Stavby-DomySRO's projects**. V zozname projektov nájsť `sd-evidencia`. Ak projekt chýba alebo prístup nie je povolený, nezakladať ďalší projekt s rovnakým názvom, nepresúvať projekt a nemanipulovať s produkčnými doménami.
2. V detaile projektu preveriť **Settings → Git**: pripojené úložisko musí zodpovedať `Nicolas-Jakubik/stavebna-appka`; produkčná vetva musí zodpovedať očakávanej `main`. Odchýlky zaznamenať, nič neprepájať automaticky.
3. V **Deployments** zistiť posledné úspešné *Production* nasadenie a jeho commit SHA. Zaznamenať iba projektový názov, cieľ, SHA a stav, nie tokeny či obsah build logov s tajomstvami.
4. V **Settings → Environment Variables** preveriť, či existuje `NEXT_PUBLIC_SUPABASE_URL` pre prostredie *Production*. Porovnať **iba projektový ref (hostname)** s očakávaným Supabase projektom. **Nikdy nezobrazovať, nekopírovať ani nezdieľať** `SUPABASE_SERVICE_ROLE_KEY`, heslá, cookies či `.env` obsah. Pri rozdiele ref okamžite zastaviť prípravu zálohy a overiť správny zdroj.
5. Skontrolovať dostupnosť a typ posledného Vercel náhľadu. Predchádzajúca chyba `build-rate-limit` znamená, že platný Preview nebol potvrdený. GitHub CI green neznamená úspešné produkčné ani Preview nasadenie.
6. Ak chýba oprávnenie (napr. 403), skontrolovať členstvo a rolu v tíme alebo upraviť autorizáciu pripojenia **cez Vercel účet**, nie zdieľaním osobného tokenu v konverzácii. Nemeňte produkciu len kvôli opraveniu čítacích oprávnení.

## Povolené záznamy na odovzdanie

Bezpečne evidovať iba **názov projektu**, **team slug**, **produkčnú doménu**, **GitHub repo**, **production branch**, **verejný Supabase project ref**, **SHA produkčného commitu** a **stav nasadenia**. Nikdy neevidovať tajné kľúče, session cookies, kópie `.env`, databázové heslá alebo osobné údaje pracovníkov.

## STOP do potvrdenia

- Vercel produkčné prostredie neoverené; neznámy reálny backend znamená, že nevieme bezpečne vybrať zdroj zálohy.
- Bez potvrdenia backendu **nespúšťať pg_dump proti predpokladanému Supabase projektu**.
- Nespájať PR #102 s `main`, nenasadzovať, nemenovať domény, nemeniť env variables a neaplikovať migrácie.
- Po overení napojenia pokračovať iba šifrovanou zálohou a nezávislou skúšobnou obnovou podľa `backup-and-restore-runbook.md`.
