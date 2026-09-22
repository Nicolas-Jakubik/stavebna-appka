const BRATISLAVA_TIME_ZONE = 'Europe/Bratislava'

export function bratislavaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRATISLAVA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function bratislavaMonthKey(date = new Date()) {
  return bratislavaDateKey(date).slice(0, 7)
}

export function jeNedela(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return false
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 0
}
