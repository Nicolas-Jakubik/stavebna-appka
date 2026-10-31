export type HourlyRateValue = number | string | null | undefined

function validRate(value: HourlyRateValue): number | null {
  // Number(null) and Number('') are zero; neither means an explicitly recorded rate.
  if (value === null || value === undefined || value === '') return null
  const rate = Number(value)
  return Number.isFinite(rate) && rate >= 0 ? rate : null
}

/**
 * A historical attendance rate belongs to the attendance entry, not the
 * employee's current profile. Fall back only for older records without a snapshot.
 */
export function hodinovaSadzbaZaznamu(
  savedRate: HourlyRateValue,
  currentRate: HourlyRateValue
): number {
  return validRate(savedRate) ?? validRate(currentRate) ?? 0
}
