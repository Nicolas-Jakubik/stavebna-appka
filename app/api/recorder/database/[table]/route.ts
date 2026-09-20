import { NextRequest } from 'next/server'
import { ADMIN_COOKIE, verifyAdminSession } from '../../../../../lib/adminSession'
import { RECORDER_COOKIE, verifyRecorderToken } from '../../../../../lib/recorderSession'
import { recorderReadQuery, validateRecorderEntries } from '../../../../../lib/recorderValidation'
import { serverDatabase } from '../../../../../lib/serverDatabase'

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }
type Context = { params: Promise<{ table: string }> }
function fail(status: number, message: string, code = `RECORDER_${status}`) {
  return Response.json({ message, code }, { status, headers })
}
async function allowed(request: NextRequest) {
  return verifyRecorderToken(request.cookies.get(RECORDER_COOKIE)?.value) ||
    await verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)
}

export async function GET(request: NextRequest, context: Context) {
  if (!await allowed(request)) return fail(401, 'Otvorte platný súkromný odkaz.')
  const { table } = await context.params
  const query = recorderReadQuery(table, request.nextUrl.searchParams)
  if (!query) return fail(400, 'Nepovolený dotaz.')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return fail(503, 'Databáza nie je nastavená.')
  try {
    const target = new URL(`/rest/v1/${table}`, url)
    target.search = query.toString()
    const result = await fetch(target, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Accept-Profile': 'public', Prefer: 'count=exact' },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000),
    })
    if (!result.ok) return fail(502, 'Údaje sa nepodarilo načítať.')
    const total = result.headers.get('content-range')?.split('/')[1]
    if (total && total !== '*' && Number(total) > 1000) return fail(422, 'Vyberte kratšie obdobie.')
    return new Response(result.body, { headers: { ...headers, 'Content-Type': 'application/json' } })
  } catch { return fail(502, 'Databáza je dočasne nedostupná.') }
}

export async function POST(request: NextRequest, context: Context) {
  if (!await allowed(request)) return fail(401, 'Otvorte platný súkromný odkaz.')
  if (request.headers.get('origin') !== request.nextUrl.origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return fail(403, 'Nepovolený pôvod požiadavky.')
  }
  if ((await context.params).table !== 'dochadzka') return fail(403, 'Povolené je iba zapisovanie dochádzky.')
  if (!request.headers.get('content-type')?.startsWith('application/json')) return fail(415, 'Očakávaný formát JSON.')
  try {
    const reader = request.body?.getReader()
    if (!reader) return fail(400, 'Chýbajú údaje.')
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 128 * 1024) { await reader.cancel(); return fail(413, 'Príliš veľa údajov.') }
      chunks.push(value)
    }
    let body: unknown
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return fail(400, 'Neplatný JSON.') }
    const entries = validateRecorderEntries(body)
    if (!entries) return fail(400, 'Skontrolujte mená, stavbu, dátum a časy po 15 minútach.')
    const { error } = await serverDatabase().rpc('record_attendance_secure', { entries })
    if (error?.code === '23505') return fail(409, 'Pracovník už má v tomto čase zápis. Obnovte prehľad.', '23505')
    if (error?.code === '22023') return fail(400, 'Vyberte existujúcich pracovníkov a aktívnu stavbu.')
    if (error) return fail(503, 'Zápis sa nepodarilo uložiť. Skúste to znova alebo kontaktujte správcu.')
    return new Response(null, { status: 201, headers })
  } catch { return fail(503, 'Zápis je dočasne nedostupný.') }
}
