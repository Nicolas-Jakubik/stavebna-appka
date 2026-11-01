/**
 * Fail closed on broad service-role mutations. Only narrowly scoped updates
 * and exact-match legacy attendance renames are allowed.
 */
export function validAdminMutationScope(method: string, table: string, query: URLSearchParams, payload?: unknown): boolean {
  if (method !== 'PATCH' && method !== 'DELETE') return true
  const params = [...query.entries()]
  const only = (...keys: string[]) =>
    params.length === keys.length &&
    keys.every(key => query.getAll(key).length === 1) &&
    params.every(([key]) => keys.includes(key))
  const idEq = (key: string) => /^eq\.[1-9]\d{0,18}$/.test(query.get(key) || '')
  const exactId = (only('id') || only('id', 'zakazka_id')) &&
    idEq('id') && (!query.has('zakazka_id') || idEq('zakazka_id'))
  if (method === 'DELETE') return exactId

  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) return false
  const fields = Object.keys(payload)
  if (fields.length === 0 || fields.includes('id')) return false

  // Existing per-project finance row is identified by its project ID.
  if (table === 'financie_stavby' && only('zakazka_id') && idEq('zakazka_id')) return true

  // Existing rename screens update all historical entries matching the old name.
  if (table === 'dochadzka') {
    for (const field of ['meno', 'zakazka'] as const) {
      const filter = query.get(field)
      const replacement = (payload as Record<string, unknown>)[field]
      if (only(field) && filter?.startsWith('eq.') && filter.slice(3).trim().length > 0 &&
          fields.length === 1 && fields[0] === field &&
          typeof replacement === 'string' && replacement.trim().length > 0) return true
    }
  }
  return exactId
}
