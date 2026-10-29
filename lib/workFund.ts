// Net working hours after the daily break: 07:00–19:00 weekdays,
// and 07:00–18:00 Saturdays, consistent with attendance payroll.
export const HODINY_PRACOVNY_DEN = 11.5
export const HODINY_SOBOTA = 10.5

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
