/**
 * Preview deployments must never contact a real payroll/attendance database by
 * merely inheriting Vercel's NEXT_PUBLIC_SUPABASE_URL from production.
 *
 * A separate Supabase project (or true isolated Supabase branch) must exist and
 * be approved before staging data access is enabled. The marker is server-only.
 * This never changes production application behavior or working bookmarks.
 */
const KNOWN_NON_STAGING_PROJECTS = new Set([
  'pfbgzwehfzgmsqjykvkb', // existing MojaFiremnaApp project; never stage on it
  'qghebrsoajcyvdezqyke', // existing CvikniSi project
  'ekmfeknsctsbycstymzk', // existing PONKARO project
])

export function previewDatabaseIsIsolated(): boolean {
  if (process.env.VERCEL_ENV !== 'preview') return true

  const stagingProjectRef = process.env.SD_EVIDENCIA_STAGING_DB_REF?.trim()
  const databaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!stagingProjectRef || !/^[a-z0-9]{20}$/.test(stagingProjectRef) ||
    KNOWN_NON_STAGING_PROJECTS.has(stagingProjectRef) || !databaseUrl) return false

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
