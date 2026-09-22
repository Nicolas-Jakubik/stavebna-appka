export type ProfitabilityInput = {
  cenaZakazky: number
  budgetNakladov: number
  aktualneNaklady: number
  vyfakturovane?: number
  prijate?: number
}

export type Profitability = {
  planovanyZisk: number
  planovanaMarzaPercent: number | null
  aktualnaRezerva: number
  aktualnaRezervaPercent: number | null
  odchylkaOdBudgetu: number
  odchylkaOdBudgetuPercent: number | null
  fakturacnyProgressPercent: number | null
  inkasnyProgressPercent: number | null
}

function percent(part: number, whole: number) {
  if (!(whole > 0)) return null
  return (part / whole) * 100
}

export function vypocitajZiskovost({
  cenaZakazky,
  budgetNakladov,
  aktualneNaklady,
  vyfakturovane = 0,
  prijate = 0,
}: ProfitabilityInput): Profitability {
  const cena = Math.max(0, Number(cenaZakazky) || 0)
  const budget = Math.max(0, Number(budgetNakladov) || 0)
  const naklady = Math.max(0, Number(aktualneNaklady) || 0)
  const fakturovane = Math.max(0, Number(vyfakturovane) || 0)
  const inkaso = Math.max(0, Number(prijate) || 0)

  const planovanyZisk = cena - budget
  const aktualnaRezerva = cena - naklady
  const odchylkaOdBudgetu = budget - naklady

  return {
    planovanyZisk,
    planovanaMarzaPercent: percent(planovanyZisk, cena),
    aktualnaRezerva,
    aktualnaRezervaPercent: percent(aktualnaRezerva, cena),
    odchylkaOdBudgetu,
    odchylkaOdBudgetuPercent: percent(odchylkaOdBudgetu, budget),
    fakturacnyProgressPercent: percent(fakturovane, cena),
    inkasnyProgressPercent: percent(inkaso, cena),
  }
}
