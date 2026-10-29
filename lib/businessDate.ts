const formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Bratislava',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** Stable business-day date in Slovakia, even when the browser/server uses UTC. */
export function datumNaSlovensku(instant: Date = new Date()): string {
  const parts = formatter.formatToParts(instant)
  const read = (type: 'year' | 'month' | 'day') => parts.find(part => part.type === type)?.value
  const year = read('year')
  const month = read('month')
  const day = read('day')
  if (!year || !month || !day) throw new Error('Nepodarilo sa určit aktualny datum.')
  return `${year}-${month}-${day}`
}

export function mesiacNaSlovensku(instant: Date = new Date()): string {
  return datumNaSlovensku(instant).slice(0, 7)
}

/**
 * Civil date arithmetic for the company's Europe/Bratislava calendar.
 * Never use the browser's timezone or parse YYYY-MM-DD as local midnight.
 */
function overPlatnyDatum(datum: string): Date {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(datum)) {
    throw new Error('Neplatny kalendarny datum.')
  }
  const [rok, mesiac, den] = datum.split('-').map(Number)
  const utc = new Date(Date.UTC(rok, mesiac - 1, den))
  if (!Number.isFinite(utc.getTime()) || utc.toISOString().slice(0, 10) !== datum) {
    throw new Error('Neexistujuci kalendarny datum.')
  }
  return utc
}

/** Sunday = 0, Monday = 1, ..., Saturday = 6. */
export function denVTyzdniNaSlovensku(datum: string): number {
  return overPlatnyDatum(datum).getUTCDay()
}

/** Add whole calendar days; stable across month/year and DST boundaries. */
export function posunDatumNaSlovensku(datum: string, dni: number): string {
  if (!Number.isSafeInteger(dni) || Math.abs(dni) > 36600) {
    throw new Error('Neplatny pocet kalendarnych dni.')
  }
  const vysledok = overPlatnyDatum(datum)
  vysledok.setUTCDate(vysledok.getUTCDate() + dni)
  return vysledok.toISOString().slice(0, 10)
}
