export const RECORDER_COLUMNS: Record<string, string> = {
  zamestnanci: 'meno', zoznam_zakaziek: 'nazov',
  dochadzka: 'meno,zakazka,datum,prichod,odchod', nepritomnosti: 'meno,datum',
}

export function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

// Rebuild queries instead of forwarding caller-controlled PostgREST syntax.
export function recorderReadQuery(table: string, input: URLSearchParams) {
  const columns = Object.hasOwn(RECORDER_COLUMNS, table) ? RECORDER_COLUMNS[table] : undefined
  if (!columns) return null
  const allowed = new Set(['select', 'order', 'datum', 'meno', 'stav'])
  if ([...input.keys()].some(key => !allowed.has(key))) return null
  const requested = input.get('select')?.split(',').map(s => s.trim()) || []
  if (requested.some(col => !columns.split(',').includes(col))) return null
  const output = new URLSearchParams({ select: columns, limit: '1000' })
  if (table === 'zamestnanci') output.set('order', 'meno.asc')
  if (table === 'zoznam_zakaziek') { output.set('order', 'nazov.asc'); output.set('stav', 'eq.Aktívna') }
  if (table === 'dochadzka' || table === 'nepritomnosti') {
    const dates = input.getAll('datum')
    if (dates.length === 1 && dates[0].startsWith('eq.') && validDate(dates[0].slice(3))) {
      output.set('datum', dates[0])
    } else if (dates.length === 2) {
      const start = dates.find(v => v.startsWith('gte.'))?.slice(4)
      const end = dates.find(v => v.startsWith('lte.'))?.slice(4)
      if (!validDate(start) || !validDate(end)) return null
      const span = Date.parse(end) - Date.parse(start)
      if (span < 0 || span > 31 * 86400000) return null
      output.append('datum', `gte.${start}`)
      output.append('datum', `lte.${end}`)
    } else return null
    // The UI filters selected names locally. Do not pass raw "in" expressions.
    output.set('order', 'datum.asc,meno.asc')
  }
  return output
}

type Entry = { meno: string; zakazka: string; datum: string; prichod: string; odchod: string }
export function validateRecorderEntries(body: unknown): Entry[] | null {
  if (!Array.isArray(body) || body.length < 1 || body.length > 200) return null
  const names = new Set<string>()
  let group = ''
  for (const row of body) {
    if (!row || typeof row !== 'object' || Object.keys(row).sort().join(',') !== 'datum,meno,odchod,prichod,zakazka') return null
    if (typeof row.meno !== 'string' || !row.meno.trim() || row.meno.length > 200 ||
        typeof row.zakazka !== 'string' || !row.zakazka.trim() || row.zakazka.length > 300 ||
        !validDate(row.datum) || typeof row.prichod !== 'string' || typeof row.odchod !== 'string' || !/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/.test(row.prichod) ||
        !/^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/.test(row.odchod) || row.prichod === row.odchod || names.has(row.meno)) return null
    const rowGroup = JSON.stringify([row.zakazka, row.datum, row.prichod, row.odchod])
    if (group && group !== rowGroup) return null
    group = rowGroup
    names.add(row.meno)
  }
  return body as Entry[]
}
