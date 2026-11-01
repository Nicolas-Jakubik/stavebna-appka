export type InvoiceAlertInput = {
  id?: string | number | null
  zakazka_id?: string | number | null
  cislo_faktury?: string | null
  dodavatel?: string | null
  datum_splatnosti?: string | null
  suma?: number | string | null
  uhradene?: boolean | null
}

export type InvoiceAlert = {
  id: string
  zakazkaId: string
  cisloFaktury: string
  dodavatel: string
  datumSplatnosti: string
  suma: number
  dniDoSplatnosti: number
  stav: 'po_splatnosti' | 'splatne_coskor'
}

/** Strict timezone-free ISO invoice date. Never normalize February 30 or other invalid dates. */
export function parseDateOnly(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null
  return parsed.getTime()
}

function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function vytvorUpozorneniaFaktur(
  faktury: InvoiceAlertInput[],
  dnes: string,
  dniDopredu = 7
): InvoiceAlert[] {
  const today = parseDateOnly(dnes)
  if (today === null) return []

  return faktury
    .filter(faktura => faktura.uhradene !== true)
    .map((faktura, index) => {
      const splatnost = String(faktura.datum_splatnosti || '')
      const due = parseDateOnly(splatnost)
      if (due === null) return null

      const dniDoSplatnosti = Math.round((due - today) / 86400000)
      if (dniDoSplatnosti > dniDopredu) return null

      return {
        id: String(faktura.id ?? index),
        zakazkaId: String(faktura.zakazka_id ?? ''),
        cisloFaktury: String(faktura.cislo_faktury || 'Bez čísla'),
        dodavatel: String(faktura.dodavatel || ''),
        datumSplatnosti: splatnost,
        suma: Math.max(0, numberValue(faktura.suma)),
        dniDoSplatnosti,
        stav: dniDoSplatnosti < 0 ? 'po_splatnosti' as const : 'splatne_coskor' as const,
      }
    })
    .filter((alert): alert is InvoiceAlert => Boolean(alert))
    .sort((a, b) => {
      if (a.stav !== b.stav) return a.stav === 'po_splatnosti' ? -1 : 1
      return a.dniDoSplatnosti - b.dniDoSplatnosti
    })
}
