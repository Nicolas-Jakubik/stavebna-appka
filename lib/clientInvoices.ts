export type KlientskaFaktura = {
  datum_vystavenia?: string | null
  datum_splatnosti?: string | null
  suma?: number | string | null
  uhradene?: boolean | null
}

function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function stavKlientskejFaktury(
  faktura: KlientskaFaktura,
  dnes: string
): 'Uhradená' | 'Po splatnosti' | 'Neuhradená' {
  if (faktura.uhradene === true) return 'Uhradená'
  const splatnost = String(faktura.datum_splatnosti || '')
  if (splatnost && splatnost < dnes) return 'Po splatnosti'
  return 'Neuhradená'
}

export function zhrnKlientskeFaktury(
  faktury: KlientskaFaktura[],
  dnes: string
) {
  return faktury.reduce((sumar, faktura) => {
    const suma = Math.max(0, numberValue(faktura.suma))
    sumar.vyfakturovane += suma

    if (faktura.uhradene === true) {
      sumar.prijate += suma
    } else {
      sumar.pohladavky += suma
      if (stavKlientskejFaktury(faktura, dnes) === 'Po splatnosti') {
        sumar.poSplatnosti += suma
        sumar.pocetPoSplatnosti += 1
      }
    }

    return sumar
  }, {
    vyfakturovane: 0,
    prijate: 0,
    pohladavky: 0,
    poSplatnosti: 0,
    pocetPoSplatnosti: 0,
  })
}
