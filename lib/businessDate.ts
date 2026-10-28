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
