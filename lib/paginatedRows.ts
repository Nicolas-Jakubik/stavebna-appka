export type PagedResult<T> = {
  data: T[] | null
  error: { message: string } | null
}

/**
 * Fetches every page in a stable order. The caller MUST sort by a unique key
 * (such as id ascending) before .range(start, end).
 *
 * Never return a partial dataset as success: missing rows would silently
 * understate wages and project costs.
 */
export async function nacitajVsetkyStrany<T>(
  fetchPage: (start: number, end: number) => Promise<PagedResult<T>>,
  pageSize = 500,
  maxPages = 200
): Promise<PagedResult<T>> {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000 ||
      !Number.isInteger(maxPages) || maxPages < 1 || maxPages > 200) {
    throw new Error('Neplatne nastavenie strankovania.')
  }

  const rows: T[] = []
  for (let page = 0; page < maxPages; page++) {
    let result: PagedResult<T>
    try {
      result = await fetchPage(page * pageSize, (page + 1) * pageSize - 1)
    } catch {
      // A rejected database request must never expose partial finance totals.
      return { data: null, error: { message: 'Stranku dochadzky sa nepodarilo nacitat.' } }
    }
    if (result.error) return { data: null, error: result.error }
    if (!Array.isArray(result.data) || result.data.length > pageSize) {
      return { data: null, error: { message: 'Neplatna odpoved databazy pri strankovani.' } }
    }
    rows.push(...result.data)
    if (result.data.length < pageSize) return { data: rows, error: null }
  }
  return { data: null, error: { message: 'Prekroceny bezpecnostny limit nacitanych stran.' } }
}
