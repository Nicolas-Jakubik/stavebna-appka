export const FINANCE_CATEGORIES = ['Pracovníci', 'Materiál', 'Subdodávatelia', 'Mechanizácia', 'Ostatné'] as const
export type FinanceCategory = typeof FINANCE_CATEGORIES[number]

export type ManualExpenseForBreakdown = {
  datum?: string | null
  kategoria?: string | null
  suma?: number | string | null
}

export type LaborEntryForBreakdown = {
  datum?: string | null
  suma?: number | string | null
}

export type MonthlyCostBreakdown = {
  key: string
  label: string
  categories: Record<FinanceCategory, number>
  total: number
}

function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  if (!year || !month) return key
  return new Date(year, month - 1, 1).toLocaleDateString('sk-SK', {
    month: 'long',
    year: 'numeric',
  })
}

export function vytvorMesacnyRozpadNakladov(
  expenses: ManualExpenseForBreakdown[],
  laborEntries: LaborEntryForBreakdown[]
): MonthlyCostBreakdown[] {
  const months = new Map<string, Record<FinanceCategory, number>>()

  function ensureMonth(key: string) {
    if (!months.has(key)) {
      months.set(key, {
        'Pracovníci': 0,
        'Materiál': 0,
        'Subdodávatelia': 0,
        'Mechanizácia': 0,
        'Ostatné': 0,
      })
    }
    return months.get(key)!
  }

  expenses.forEach(expense => {
    const datum = String(expense.datum || '')
    if (datum.length < 7) return
    const key = datum.slice(0, 7)
    const category = FINANCE_CATEGORIES.includes(expense.kategoria as FinanceCategory)
      ? expense.kategoria as FinanceCategory
      : 'Ostatné'
    ensureMonth(key)[category] += numberValue(expense.suma)
  })

  laborEntries.forEach(entry => {
    const datum = String(entry.datum || '')
    if (datum.length < 7) return
    const key = datum.slice(0, 7)
    ensureMonth(key)['Pracovníci'] += numberValue(entry.suma)
  })

  return Array.from(months.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, categories]) => ({
      key,
      label: monthLabel(key),
      categories,
      total: FINANCE_CATEGORIES.reduce((sum, category) => sum + categories[category], 0),
    }))
}
