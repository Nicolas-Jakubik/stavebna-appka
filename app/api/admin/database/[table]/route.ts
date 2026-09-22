import { NextRequest } from 'next/server'
import { ADMIN_COOKIE, verifyAdminSession } from '../../../../../lib/adminSession'

export const dynamic = 'force-dynamic'
const TABLES = new Set(['dochadzka', 'zamestnanci', 'zoznam_zakaziek', 'nepritomnosti', 'financie_stavby', 'naklady_stavby', 'platby_stavby', 'uhrady_pracovnikov', 'faktury_dodavatelov', 'faktury_klientov'])
const MAX_BODY_BYTES = 256 * 1024
type Context = { params: Promise<{ table: string }> }

function error(status: number, message: string) {
  return Response.json({ message, code: `ADMIN_${status}` }, {
    status, headers: { 'Cache-Control': 'private, no-store' },
  })
}

async function handle(request: NextRequest, context: Context) {
  if (!await verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return error(401, 'Prihláste sa do administrácie.')
  }

  const { table } = await context.params
  if (!TABLES.has(table)) return error(404, 'Neznáma tabuľka.')

  const mutation = !['GET', 'HEAD'].includes(request.method)
  // A session cookie alone must not authorize cross-site writes.
  if (mutation && (request.headers.get('origin') !== request.nextUrl.origin ||
      request.headers.get('sec-fetch-site') === 'cross-site')) {
    return error(403, 'Nepovolený pôvod požiadavky.')
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  // Fail closed: never silently fall back to the anonymous database role.
  if (!baseUrl || !key) return error(503, 'Prístup administrácie k databáze nie je nastavený.')

  let body: string | undefined
  if (['POST', 'PATCH'].includes(request.method)) {
    if (!request.headers.get('content-type')?.startsWith('application/json')) {
      return error(415, 'Očakávaný formát JSON.')
    }
    const reader = request.body?.getReader()
    if (!reader) return error(400, 'Chýbajú údaje.')
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BODY_BYTES) {
        await reader.cancel()
        return error(413, 'Príliš veľa údajov v jednej požiadavke.')
      }
      chunks.push(value)
    }
    body = Buffer.concat(chunks).toString('utf8')
    try { JSON.parse(body) } catch { return error(400, 'Neplatný JSON.') }
  }

  // Fixed destination and table allowlist: no arbitrary URLs, RPCs or schemas.
  const target = new URL(`/rest/v1/${table}`, baseUrl)
  target.search = request.nextUrl.search
  const headers = new Headers({ apikey: key, Authorization: `Bearer ${key}` })
  for (const name of ['accept', 'content-type', 'prefer', 'range', 'range-unit']) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }
  headers.set('Accept-Profile', 'public')
  headers.set('Content-Profile', 'public')
  // Forbid EXPLAIN / alternate output formats on the privileged connection.
  if (!['application/json', 'application/vnd.pgrst.object+json', '*/*'].includes(headers.get('accept') || 'application/json')) {
    return error(406, 'Nepodporovaný formát odpovede.')
  }

  try {
    const upstream = await fetch(target, {
      method: request.method, headers, body, cache: 'no-store',
      redirect: 'error', signal: AbortSignal.timeout(15000),
    })
    const responseHeaders = new Headers({ 'Cache-Control': 'private, no-store', Vary: 'Cookie' })
    for (const name of ['content-type', 'content-range', 'preference-applied']) {
      const value = upstream.headers.get(name)
      if (value) responseHeaders.set(name, value)
    }
    return new Response(request.method === 'HEAD' || upstream.status === 204 ? null : upstream.body, {
      status: upstream.status, headers: responseHeaders,
    })
  } catch {
    return error(502, 'Databáza je dočasne nedostupná. Skúste to znova.')
  }
}

export { handle as GET, handle as HEAD, handle as POST, handle as PATCH, handle as DELETE }
