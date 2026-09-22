import { PracovnyZaznam, hodinyZaznamuZMapy, vytvorMapuCistychHodin } from './workHours'

export type ZamestnanecSoSadzbou = {
  meno?: string | null
  sadzba?: number | string | null
}

export type NakladPracovnika = {
  datum: string
  meno: string
  zakazka: string
  hodiny: number
  sadzba: number
  suma: number
  maSadzbu: boolean
}

function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function vypocitajNakladyPracovnikov(
  zaznamy: PracovnyZaznam[],
  zamestnanci: ZamestnanecSoSadzbou[]
): NakladPracovnika[] {
  const sadzby = new Map<string, number>()
  zamestnanci.forEach(zamestnanec => {
    const meno = String(zamestnanec.meno || '').trim()
    if (!meno) return
    sadzby.set(meno, Math.max(0, numberValue(zamestnanec.sadzba)))
  })

  const mapaCistychHodin = vytvorMapuCistychHodin(zaznamy)

  return zaznamy
    .map(zaznam => {
      const meno = String(zaznam.meno || '').trim()
      const zakazka = String(zaznam.zakazka || '').trim()
      const datum = String(zaznam.datum || '').trim()
      if (!meno || !zakazka || !datum) return null

      const hodiny = hodinyZaznamuZMapy(zaznam, mapaCistychHodin)
      const sadzba = sadzby.get(meno) || 0

      return {
        datum,
        meno,
        zakazka,
        hodiny,
        sadzba,
        suma: hodiny * sadzba,
        maSadzbu: sadzba > 0,
      }
    })
    .filter((polozka): polozka is NakladPracovnika => Boolean(polozka))
}

export function zhrnNakladyPracovnikovPodlaZakazky(polozky: NakladPracovnika[]) {
  const mapa = new Map<string, {
    hodiny: number
    suma: number
    pracovnici: Set<string>
    bezSadzby: Set<string>
  }>()

  polozky.forEach(polozka => {
    const current = mapa.get(polozka.zakazka) || {
      hodiny: 0,
      suma: 0,
      pracovnici: new Set<string>(),
      bezSadzby: new Set<string>(),
    }

    current.hodiny += polozka.hodiny
    current.suma += polozka.suma
    current.pracovnici.add(polozka.meno)
    if (!polozka.maSadzbu && polozka.hodiny > 0) current.bezSadzby.add(polozka.meno)
    mapa.set(polozka.zakazka, current)
  })

  return mapa
}
