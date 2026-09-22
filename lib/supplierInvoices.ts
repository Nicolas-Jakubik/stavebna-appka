export type DodavatelskaFaktura = {
  datum_vystavenia?: string | null
  datum_splatnosti?: string | null
  kategoria?: string | null
  suma?: number | string | null
  uhradene?: boolean | null
}

function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function stavDodavatelskejFaktury(
  faktura: DodavatelskaFaktura,
  dnes: string
): 'Uhradená' | 'Po splatnosti' | 'Neuhradená' {
  if (faktura.uhradene === true) return 'Uhradená'
  const splatnost = String(faktura.datum_splatnosti || '')
  if (splatnost && splatnost < dnes) return 'Po splatnosti'
  return 'Neuhradená'
}

export function zhrnDodavatelskeFaktury(
  faktury: DodavatelskaFaktura[],
  dnes: string
) {
  return faktury.reduce((sumar, faktura) => {
    const suma = Math.max(0, numberValue(faktura.suma))
    sumar.spolu += suma
    if (faktura.uhradene === true) sumar.uhradene += suma
    else {
      sumar.neuhradene += suma
      if (stavDodavatelskejFaktury(faktura, dnes) === 'Po splatnosti') {
        sumar.poSplatnosti += suma
        sumar.pocetPoSplatnosti += 1
      }
    }
    return sumar
  }, {
    spolu: 0,
    uhradene: 0,
    neuhradene: 0,
    poSplatnosti: 0,
    pocetPoSplatnosti: 0,
  })
}

export function fakturyAkoNaklady(faktury: DodavatelskaFaktura[]) {
  return faktury.map(faktura => ({
    datum: String(faktura.datum_vystavenia || ''),
    kategoria: String(faktura.kategoria || 'Ostatné'),
    suma: numberValue(faktura.suma),
  }))
}
