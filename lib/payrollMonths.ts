import { mesiacNaSlovensku } from './businessDate'

const nazvyMesiacov = [
  'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
  'Júl', 'August', 'September', 'Október', 'November', 'December',
]

export type MesiacVyplat = { hodnota: string; nazov: string }

/**
 * Every payroll period since the app's first accounting year remains
 * selectable, including the next year, without editing the UI each January.
 */
export function mesiaceVyplat(instant: Date = new Date()): MesiacVyplat[] {
  const lokalnyRok = Number(mesiacNaSlovensku(instant).slice(0, 4))
  const prvyRok = 2026
  const poslednyRok = Math.max(prvyRok, lokalnyRok + 1)
  const mesiace: MesiacVyplat[] = []
  for (let rok = prvyRok; rok <= poslednyRok; rok++) {
    for (let mesiac = 1; mesiac <= 12; mesiac++) {
      mesiace.push({
        hodnota: `${rok}-${String(mesiac).padStart(2, '0')}`,
        nazov: `${nazvyMesiacov[mesiac - 1]} ${rok}`,
      })
    }
  }
  return mesiace
}
