export type PracovnyZaznam = {
  id?: string | number | null
  meno?: string | null
  datum?: string | null
  zakazka?: string | null
  prichod?: string | null
  odchod?: string | null
}

export const PRESTAVKA_MINUTY = 30
export const HRANICA_PRESTAVKY_MINUTY = 5.5 * 60

function casNaMinuty(cas?: string | null) {
  if (!cas) return null
  const [hodiny, minuty] = cas.split(':').map(Number)
  if (!Number.isFinite(hodiny) || !Number.isFinite(minuty)) return null
  return hodiny * 60 + minuty
}

export function vypocitajTrvanieUsekuMinuty(prichod?: string | null, odchod?: string | null) {
  const zaciatok = casNaMinuty(prichod)
  const koniecPovodny = casNaMinuty(odchod)
  if (zaciatok === null || koniecPovodny === null) return 0

  let koniec = koniecPovodny
  if (koniec < zaciatok) koniec += 24 * 60
  if (koniec === zaciatok) return 0
  return koniec - zaciatok
}

export function vypocitajTrvanieUsekuHodiny(prichod?: string | null, odchod?: string | null) {
  return vypocitajTrvanieUsekuMinuty(prichod, odchod) / 60
}

export function vypocitajHodinyJednehoUseku(prichod?: string | null, odchod?: string | null) {
  const minuty = vypocitajTrvanieUsekuMinuty(prichod, odchod)
  return (minuty - (minuty > HRANICA_PRESTAVKY_MINUTY ? PRESTAVKA_MINUTY : 0)) / 60
}

export function klucPracovnehoZaznamu(zaznam: PracovnyZaznam) {
  if (zaznam.id !== undefined && zaznam.id !== null && String(zaznam.id) !== '') {
    return `id:${String(zaznam.id)}`
  }

  return [
    'zaznam',
    String(zaznam.meno || ''),
    String(zaznam.datum || ''),
    String(zaznam.zakazka || ''),
    String(zaznam.prichod || ''),
    String(zaznam.odchod || '')
  ].join('|')
}

function intervalObsahujePoludnie(zaznam: PracovnyZaznam) {
  const zaciatok = casNaMinuty(zaznam.prichod)
  const koniecPovodny = casNaMinuty(zaznam.odchod)
  if (zaciatok === null || koniecPovodny === null) return false

  let koniec = koniecPovodny
  if (koniec < zaciatok) koniec += 24 * 60

  let poludnie = 12 * 60
  if (poludnie < zaciatok) poludnie += 24 * 60
  return poludnie >= zaciatok && poludnie < koniec
}

export function vytvorMapuCistychHodin(zaznamy: PracovnyZaznam[]) {
  const cisteMinuty = new Map<string, number>()
  const skupiny = new Map<string, Array<{ zaznam: PracovnyZaznam; minuty: number }>>()

  zaznamy.forEach((zaznam, index) => {
    const minuty = vypocitajTrvanieUsekuMinuty(zaznam.prichod, zaznam.odchod)
    const meno = String(zaznam.meno || '').trim()
    const datum = String(zaznam.datum || '').trim()
    const skupina = meno && datum ? `${meno}|${datum}` : `samostatny|${index}|${klucPracovnehoZaznamu(zaznam)}`
    const polozky = skupiny.get(skupina) || []
    polozky.push({ zaznam, minuty })
    skupiny.set(skupina, polozky)
  })

  skupiny.forEach(polozky => {
    polozky.forEach(({ zaznam, minuty }) => {
      cisteMinuty.set(klucPracovnehoZaznamu(zaznam), minuty)
    })

    const minutySpolu = polozky.reduce((sucet, polozka) => sucet + polozka.minuty, 0)
    if (minutySpolu <= HRANICA_PRESTAVKY_MINUTY) return

    let zostavajucaPrestavka = PRESTAVKA_MINUTY
    const poradieNaPrestavku = [...polozky].sort((a, b) => {
      const aPoludnie = intervalObsahujePoludnie(a.zaznam) ? 1 : 0
      const bPoludnie = intervalObsahujePoludnie(b.zaznam) ? 1 : 0
      if (aPoludnie !== bPoludnie) return bPoludnie - aPoludnie
      if (a.minuty !== b.minuty) return b.minuty - a.minuty
      return String(a.zaznam.prichod || '').localeCompare(String(b.zaznam.prichod || ''))
    })

    for (const { zaznam } of poradieNaPrestavku) {
      if (zostavajucaPrestavka <= 0) break
      const kluc = klucPracovnehoZaznamu(zaznam)
      const aktualne = cisteMinuty.get(kluc) || 0
      const odpocitat = Math.min(aktualne, zostavajucaPrestavka)
      cisteMinuty.set(kluc, aktualne - odpocitat)
      zostavajucaPrestavka -= odpocitat
    }
  })

  const hodiny = new Map<string, number>()
  cisteMinuty.forEach((minuty, kluc) => hodiny.set(kluc, minuty / 60))
  return hodiny
}

export function hodinyZaznamuZMapy(zaznam: PracovnyZaznam, mapa: Map<string, number>) {
  return mapa.get(klucPracovnehoZaznamu(zaznam)) ?? vypocitajHodinyJednehoUseku(zaznam.prichod, zaznam.odchod)
}
