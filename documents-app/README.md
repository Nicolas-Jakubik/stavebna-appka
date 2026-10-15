# STAVBY–DOMY Dokumenty

Samostatný zdroj pre firemnú aplikáciu: Súpisy prác, Objednávky a Cenové ponuky.

Vercel root directory: `documents-app`.

`payload.br` obsahuje zdroj statických stránok; `build.js` ich pri deploymente rozbalí do `dist`. Cloud úložisko Súpisov je počas migrácie bezpečne proxyované na existujúci produkčný backend cez `vercel.json`.
