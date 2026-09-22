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

function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return Date.UTC(year, month - 1, day)
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
