// Confirmed company schedule (2026-11-01): weekdays 07:00–18:00,
// Saturdays 07:00–17:00, Sundays off. Subtract one 30-minute daily break.
// These are NET planned hours, not the duration before the break.
export const HODINY_PRACOVNY_DEN = 10.5
export const HODINY_SOBOTA = 9.5

export function vypocitajFondObdobia(mesiac: string, odDna = 1, doDna?: number) {
  const [rokText, mesiacText] = mesiac.split('-')
  const rok = Number(rokText)
  const mesiacIndex = Number(mesiacText) - 1

  if (!Number.isInteger(rok) || mesiacIndex < 0 || mesiacIndex > 11) return 0

  const pocetDni = new Date(Date.UTC(rok, mesiacIndex + 1, 0)).getUTCDate()
  const prvyDen = Math.max(1, odDna)
  const poslednyDen = Math.min(doDna ?? pocetDni, pocetDni)
  let fond = 0

  for (let den = prvyDen; den <= poslednyDen; den++) {
    const denVTyzdni = new Date(Date.UTC(rok, mesiacIndex, den)).getUTCDay()
    if (denVTyzdni === 0) continue
    fond += denVTyzdni === 6 ? HODINY_SOBOTA : HODINY_PRACOVNY_DEN
  }

  return fond
}
