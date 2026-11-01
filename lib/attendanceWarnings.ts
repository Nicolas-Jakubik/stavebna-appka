/**
 * Read-only admin hint, not a payroll rule or a prohibition on overtime.
 * Confirmed normal company hours: Mon-Fri 07:00-18:00, Sat 07:00-17:00,
 * Sunday ordinarily off. Actual attendance is never modified by this check.
 */
export function jeNeobvyklaDochadzka(zaznam: {
  datum: string,
  prichod: string,
  odchod: string,
  hodiny: number,
}): boolean {
  const { datum, prichod, odchod, hodiny } = zaznam
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum || '')) return true
  const date = new Date(`${datum}T12:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== datum) return true
  const timeFormat = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/
  if (!timeFormat.test(prichod || '') || !timeFormat.test(odchod || '')) return true
  if (!Number.isFinite(hodiny) || hodiny <= 0 || hodiny > 14) return true
  const day = date.getUTCDay()
  if (day === 0) return true
  const start = prichod.slice(0,5)
  const end = odchod.slice(0,5)
  // Beyond-midnight work should also be reviewed, not silently rejected.
  if (end <= start) return true
  if (start < '07:00') return true
  return end > (day === 6 ? '17:00' : '18:00')
}
