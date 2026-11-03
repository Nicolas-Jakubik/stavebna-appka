/**
 * Preview deployments must never contact a real payroll/attendance database by
 * merely inheriting Vercel's NEXT_PUBLIC_SUPABASE_URL from production.
 *
 * A separate Supabase project (or true isolated Supabase branch) must exist and
 * be approved before staging data access is enabled. The marker is server-only.
 * This never changes production application behavior or working bookmarks.
 */
// This is a known current company database ref, not a credential. Other
// projects are intentionally not enumerated in this app's repository.
const KNOWN_PRODUCTION_PROJECT_REF = 'pfbgzwehfzgmsqjykvkb'

export function previewDatabaseIsIsolated(): boolean {
  if (process.env.VERCEL_ENV !== 'preview') return true

  const stagingProjectRef = process.env.SD_EVIDENCIA_STAGING_DB_REF?.trim()
  const databaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!stagingProjectRef || !/^[a-z0-9]{20}$/.test(stagingProjectRef) ||
    stagingProjectRef === KNOWN_PRODUCTION_PROJECT_REF || !databaseUrl) return false

  try {
    const parsed = new URL(databaseUrl)
    return parsed.protocol === 'https:' &&
      parsed.hostname === `${stagingProjectRef}.supabase.co` &&
      parsed.port === '' && parsed.pathname === '/' &&
      parsed.search === '' && parsed.hash === '' &&
      parsed.username === '' && parsed.password === ''
  } catch {
    return false
  }
}
