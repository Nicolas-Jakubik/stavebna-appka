export type ZaznamSadzby = {
  meno?: string | null
  sadzba_snapshot?: number | string | null
}

export type ProfilSadzby = {
  meno?: string | null
  sadzba?: number | string | null
}

function platnaSadzba(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null
  const rate = Number(value)
  return Number.isFinite(rate) && rate >= 0 ? rate : null
}

/**
 * A read-only warning for the admin payroll overview. It is NOT a record of
 * payment approval and must never silently adjust a historical payroll amount.
 * Comparison to today's employee rate cannot establish when a raise applied.
 */
export function auditujSadzbyVyplat(
  zaznamy: ZaznamSadzby[],
  profily: ProfilSadzby[]
) {
  const aktualneSadzby = new Map<string, number | null>()
  for (const profil of profily) {
    if (!profil.meno) continue
    // Names are the legacy link between attendance and profiles. If two
    // profiles have the same name, do not silently pick the last profile.
    // Mark all such comparisons as inconclusive without changing payouts.
    if (aktualneSadzby.has(profil.meno)) {
      aktualneSadzby.set(profil.meno, null)
      continue
    }
    aktualneSadzby.set(profil.meno, platnaSadzba(profil.sadzba))
  }

  let odlisneSadzby = 0
  let bezHistorickejSadzby = 0
  let bezPorovnatelnehoProfilu = 0

  for (const zaznam of zaznamy) {
    const historicka = platnaSadzba(zaznam.sadzba_snapshot)
    if (historicka === null) {
      bezHistorickejSadzby++
      continue
    }
    const aktualna = zaznam.meno ? aktualneSadzby.get(zaznam.meno) : null
    if (aktualna === null || aktualna === undefined) {
      bezPorovnatelnehoProfilu++
      continue
    }
    if (Math.abs(historicka - aktualna) > 0.000001) odlisneSadzby++
  }

  return { odlisneSadzby, bezHistorickejSadzby, bezPorovnatelnehoProfilu }
}
