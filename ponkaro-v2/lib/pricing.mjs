export const VAT_RATE = 0.23;
function value(x, name) {
  const n = typeof x === "string" ? Number(x.trim().replace(",", ".")) : Number(x ?? 0);
  if (!Number.isFinite(n) || n < 0) throw new RangeError("Neplatná hodnota: " + name);
  return n;
}
export function money(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
/**
 * Jedna položka môže mať oddelenú JC práca / JC materiál alebo jednu spoločnú JC.
 * Prirážky sa uplatňujú len na samostatné ceny práce a materiálu, nie na spoločnú JC.
 */
export function lineTotal(item, settings = {}) {
  const quantity = value(item.quantity, "množstvo");
  const combined = settings.columns?.combined === false ? null : item.combinedUnitPrice;
  if (combined !== null && combined !== undefined && combined !== "") {
    return money(quantity * value(combined, "JC spolu"));
  }
  const workMarkup = value(settings.workMarkupPercent, "prirážka práca");
  const materialMarkup = value(settings.materialMarkupPercent, "prirážka materiál");
  const work = (settings.columns?.work === false ? 0 : value(item.workUnitPrice, "JC práca")) * (1 + workMarkup / 100);
  const material = (settings.columns?.material === false ? 0 : value(item.materialUnitPrice, "JC materiál")) * (1 + materialMarkup / 100);
  return money(quantity * (work + material));
}
export function totals(items = [], settings = {}) {
  const subtotal = money(items.filter((i) => i.type !== "section").reduce((sum, i) => sum + lineTotal(i, settings), 0));
  const vatRate = settings.includeVat === false ? 0 : VAT_RATE;
  const vat = money(subtotal * vatRate);
  let total = money(subtotal + vat);
  const increment = settings.roundTotalTo == null || settings.roundTotalTo === "" ? 0.01 : value(settings.roundTotalTo, "zaokrúhľovanie");
  if (increment > 0) total = money(Math.round(total / increment) * increment);
  return { subtotal, vat, total, currency: "EUR", vatRate };
}
