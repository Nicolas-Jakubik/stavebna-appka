# FiremnáApka: bezpečné zálohovanie a obnova (príprava)

**Stav:** Pripravený návod a skript. Neexistuje potvrdenie, že bola
vytvorená úplná záloha alebo vykonaná obnova. Produkciu nemažte ani
neupravujte len na základe úspešného výpisu archívu.

## Účel

Skript `scripts/backup-public-db.sh` vykoná **iba čítanie** z PostgreSQL
databázy Supabase a do súkromného priečinka mimo Git repozitára uloží
archív `pg_dump` vo formáte custom.

- Zahŕňa tabuľky a štruktúru schémy `public` (vrátane dochádzky).
- **Nezahŕňa** automaticky dáta schém `auth`, `storage`, súbory v
  Storage buckete, konfiguráciu Vercelu, heslá ani všetky systémové
  nastavenia projektu. Na úplnú katastrofickú obnovu sa vyžadujú ďalšie
  samostatné exporty a testy.
- Čítací dump nemení dáta v produkcii. Môže však vytvárať záťaž;
  spúšťajte ho mimo najrušnejšej prevádzky.
- Výstup obsahuje citlivé firemné údaje: **nikdy ho necommitujte do
  verejného GitHubu ani nezverejňujte cez odkaz**.

## Predpoklady

1. Použiť `pg_dump` a `pg_restore` kompatibilné so serverom PostgreSQL 17.
2. Mať práva na čítanie požadovanej schémy v priamom alebo session
   pripojení k Supabase. Nepoužívať transakčný pooler.
3. Pripraviť súkromné šifrované úložisko **mimo repo**; overiť voľné
   miesto a prístupové oprávnenia.
4. Parametre pripojenia nájsť v Supabase Dashboard > Connect; DB heslo
   **nikdy neposielať do četu ani neukladať do zdrojových súborov**.

## Bezpečné lokálne spustenie

Na vlastnom počítači, ktorý má prístup k Supabase PostgreSQL:

```bash
export PGHOST='HOST_Z_DASHBOARDU'
export PGPORT='5432'
export PGUSER='UZIVATEL_Z_DASHBOARDU'
export PGDATABASE='postgres'
export PGSSLMODE='require'
export BACKUP_DIR="$HOME/Private-FiremnaApka-Backups"
read -r -s -p 'Database password: ' PGPASSWORD
printf '\n'
export PGPASSWORD
bash scripts/backup-public-db.sh
unset PGPASSWORD
```

Nepoužívajte doslovné zástupné hodnoty z príkladu. Pripojenie môže
závisieť od IPv4/IPv6 a režimu poolera.

## Overenie pred produkčnou zmenou

- `pg_restore --list ARCHIV.dump` musí byť čitateľný a obsahovať
  `TABLE DATA public dochadzka`.
- Súbor presunúť do súkromného šifrovaného úložiska mimo Supabase a
  preveriť, že sa dá znovu stiahnuť.
- V **izolovanej testovacej databáze s vlastnými prihlasovacími
  údajmi** obnoviť archív a porovnať počty riadkov, referencie,
  obmedzenia a testy aplikácie. Nikdy nespúšťať `pg_restore --clean`
  na produkčnej databáze.
- Po úspešnom teste uložiť dátum, kontrolný súčet, počet záznamov a
  odkaz na interné úložisko do súkromného protokolu.
- Až po potvrdení úplnosti zálohy a pripraveného rollback plánu
  schvaľovať nasadenie bezpečnostných a databázových opráv.

## Automatizácia (zatiaľ nezapnutá)

Pravidelnú zálohu možno spúšťať z dôveryhodného počítača alebo
z uzavretého CI prostredia s privátnymi tajnými premennými a šifrovaným
cieľom. **Verejné GitHub Actions artifacts nie sú vhodné na uchovávanie
neosobitne šifrovaných výplatných/dochádzkových údajov.**
