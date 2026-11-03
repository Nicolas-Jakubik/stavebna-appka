import { createClient } from '@supabase/supabase-js'
import { previewDatabaseIsIsolated } from './previewDatabaseIsolation'

// Import only from server routes. No database key is returned to callers.
export function serverDatabase() {
  if (!previewDatabaseIsIsolated()) throw new Error('Preview database is not isolated')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Server database is not configured')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(15000) }) },
  })
}
