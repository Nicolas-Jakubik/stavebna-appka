# PONKARO – čistá verzia (pracovná vetva)

Toto je začiatok nového, samostatne navrhovaného systému na jednoduché súpisy prác, cenové ponuky a objednávky.

**Bezpečnostná hranica:** táto vetva nemení `main`, produkčný projekt `sd-evidencia`, databázu `MojaFiremnaApp` ani prevádzkové PONKARO. Pred nasadením sa kód presunie do samostatného repozitára.

## Rozsah prvej verzie
- Súpisy prác – položky, oddiely, ceny práce/materiálu alebo spoločná JC, prirážky, zaokrúhľovanie výsledku.
- Cenové ponuky – rovnaké jadro cien, DPH 23 %, bez lehoty platnosti, úpravy a kópia ponuky.
- Objednávky – zoznam materiálu, dodávateľ, príprava textu e-mailu pre webmail, stavy pripravené/objednané/čiastočne dodané/dodané.
- A4 PDF/print s voliteľnými stĺpcami, vhodné pre čiernobielu tlač a s voliteľným logom.
- Trvalé **cloudové** uloženie a záloha pred produkčným používaním. Nie iba localStorage.
- Minimum prihlásení pre dve interné osoby; práva a ochrana úložiska musia byť vyriešené pred produkciou.

## Postup
1. Oddelený základ aplikácie + testy výpočtov.
2. Izolovaná databáza (nesmie sa použiť databáza evidencie).
3. Jednotné rozhranie troch modulov a exporty.
4. Migrácia výlučne potrebných údajov, zálohy a kontrola.
5. Produkčné spustenie až po reálnych testoch.
6. Odstránenie starých PONKARO projektov až po potvrdení, že nová verzia funguje.

## Stav
Príprava a vývojová vetva. **Nie je nasadené** ani určené na reálne dokumenty. Evidencia je nedotknutá.
