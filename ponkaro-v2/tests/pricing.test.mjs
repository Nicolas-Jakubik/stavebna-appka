import test from "node:test";
import assert from "node:assert/strict";
import { lineTotal, totals } from "../lib/pricing.mjs";

test("oddelená práca a materiál – prirážky", () => {
  const i = { quantity: 10, workUnitPrice: 20, materialUnitPrice: 30 };
  assert.equal(lineTotal(i, { workMarkupPercent: 10, materialMarkupPercent: 20 }), 580);
});
test("spoločná jednotková cena má prednosť", () => {
  const i = { quantity: 10, workUnitPrice: 20, materialUnitPrice: 30, combinedUnitPrice: 45 };
  assert.equal(lineTotal(i, { workMarkupPercent: 10, materialMarkupPercent: 20 }), 450);
});
test("DPH 23 %", () => {
  const t = totals([{ quantity: 10, combinedUnitPrice: 45 }]);
  assert.deepEqual(t, { subtotal: 450, vat: 103.5, total: 553.5, currency: "EUR", vatRate: 0.23 });
});
test("bez DPH a zaokrúhlenie výslednej sumy", () => {
  const t = totals([{ quantity: 1, combinedUnitPrice: 13.42 }], { includeVat: false, roundTotalTo: 1 });
  assert.equal(t.total, 13);
  assert.equal(t.vat, 0);
});
test("neplatné množstvo odmietnuť", () => {
  assert.throws(() => lineTotal({ quantity: -1 }), RangeError);
});

test("skrytá spoločná JC nemení oddelené ceny", () => {
  const item = { quantity: 2, workUnitPrice: 20, materialUnitPrice: 30, combinedUnitPrice: 999 };
  const t = totals([item], { includeVat: false, columns: { work: true, material: true, combined: false } });
  assert.equal(t.total, 100);
});
test("objednávka bez zobrazených cien nemá falošný súčet", () => {
  const item = { quantity: 3, workUnitPrice: 10, materialUnitPrice: 40 };
  const t = totals([item], { includeVat: false, columns: { work: false, material: false, combined: false } });
  assert.equal(t.total, 0);
});
test("oddiel je mimo kalkulácie", () => {
  const docs = [{ type: "section", description: "Príprava" }, { type: "item", quantity: 2, combinedUnitPrice: 15 }];
  assert.equal(totals(docs, { includeVat: false }).total, 30);
});
