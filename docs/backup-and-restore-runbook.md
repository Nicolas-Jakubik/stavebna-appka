# FiremnáApka: bezpečné zálohovanie a obnova (príprava)

**Stav:** Pripravený návod a skript. Neexistuje potvrdenie, že bola
vytvorená úplná záloha alebo vykonaná obnova. Produkciu nemažte ani
neupravujte len na základe úspešného výpisu archívu.

## Účel

Skript `scripts/backup-public-db.sh` vykoná **iba čítanie** z PostgreSQL
databázy Supabase a do súkromného priečinka mimo Git repozitára uloží
archív `pg_dump` vo formáte custom **priamo zašifrovaný cez age** ako `.dump.age`. Žiadny nešifrovaný dočasný dump sa nezapisuje na disk.

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

1. Použiť `pg_dump` a `pg_restore` kompatibilné so serverom PostgreSQL 17 a nainštalovať nástroj **age** na šifrovanie.
2. Mať práva na čítanie požadovanej schémy v priamom alebo session
   pripojení k Supabase. Nepoužívať transakčný pooler.
3. Pripraviť súkromné šifrované úložisko **mimo repo**; overiť voľné
   miesto a prístupové oprávnenia.
4. Parametre pripojenia nájsť v Supabase Dashboard > Connect **po overení, ktorý projekt používa produkčné nasadenie**; DB heslo nikdy neposielať do četu.
5. Len lokálne vygenerovať age identitu (`age-keygen -o "$HOME/.config/age/firemnaappka-identity.txt"`) do súkromného priečinka. Kľúč uchovať oddelene od záloh a neukladať ho do Git repozitára.

## Bezpečné lokálne spustenie

Na vlastnom počítači, ktorý má prístup k Supabase PostgreSQL:

```bash
export PGHOST='HOST_Z_DASHBOARDU'
export PGPORT='5432'
export PGUSER='UZIVATEL_Z_DASHBOARDU'
export PGDATABASE='postgres'
export PGSSLMODE='require'
export BACKUP_DIR="$HOME/Private-FiremnaApka-Backups"
export BACKUP_AGE_RECIPIENT="$(age-keygen -y "$HOME/.config/age/firemnaappka-identity.txt")"
export BACKUP_AGE_IDENTITY="$HOME/.config/age/firemnaappka-identity.txt"
read -r -s -p 'Database password: ' PGPASSWORD
printf '\n'
export PGPASSWORD
bash scripts/backup-public-db.sh
unset PGPASSWORD
```

Nepoužívajte doslovné zástupné hodnoty z príkladu. Pripojenie môže
závisieť od IPv4/IPv6 a režimu poolera.

## Overenie pred produkčnou zmenou

- Zašifrovaný archív `.dump.age` dešifrovať lokálne pomocou age identity. Skript voliteľne spúšťa `age --decrypt` priamo do `pg_restore --list -` bez zápisu nešifrovaných bajtov na disk a musí nájsť `TABLE DATA public dochadzka`.
- Aj po tejto kontrole je **povinná** skutočná obnova do izolovanej databázy. V nej možno na bezpečnom šifrovanom úložisku dočasne dešifrovať dump pre `pg_restore`; do produkčnej DB nikdy neobnovovať naslepo.
- Súbor presunúť do súkromného šifrovaného úložiska mimo Supabase a
  preveriť, že sa dá znovu stiahnuť.
- V **izolovanej testovacej databáze s vlastnými prihlasovacími
  údajmi** obnoviť archív a porovnať počty riadkov, referencie,
  obmedzenia a testy aplikácie. Nikdy nespúšťať `pg_restore --clean`
  na produkčnej databáze.
- Po obnovení overiť aj aktuálnu funkciu `record_attendance_secure(jsonb)` vrátane `objekt_id`, oprávnenia a triggery. **Staršie RPC migrácie sú prekonané novšou `20261001103500_project_objects.sql`, ktorá `objekt_id` podporuje.** Otvorenou úlohou je zladenie reálne aplikovaných migračných verzií; migrácie neprehrávať naslepo nad obnovenou databázou.
- Po úspešnom teste uložiť dátum, kontrolný súčet, počet záznamov a
  odkaz na interné úložisko do súkromného protokolu.
- Až po potvrdení úplnosti zálohy a pripraveného rollback plánu
  schvaľovať nasadenie bezpečnostných a databázových opráv.

## Automatizácia (zatiaľ nezapnutá)

Pravidelnú zálohu možno spúšťať z dôveryhodného počítača alebo
z uzavretého CI prostredia s privátnymi tajnými premennými a šifrovaným
cieľom. **Verejné GitHub Actions artifacts nie sú vhodné na uchovávanie
neosobitne šifrovaných výplatných/dochádzkových údajov.**

## Význam testov

Testovacie GitHub Actions môžu použiť len fiktívny `pg_dump` a testovací age kľúč, aby overili šifrovaciu cestu. **Tento test nie je dôkaz skutočnej zálohy.** Kým nebude potvrdená správna produkčná DB a úspešný izolovaný restore, nasadenie zostáva zablokované.
