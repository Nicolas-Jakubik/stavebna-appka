import { NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  createAdminSession,
  isAdminPasswordConfigured,
  isCorrectAdminPassword,
} from '../../../../lib/adminSession'

export async function POST(request: Request) {
  // A browser login must originate from this application, never another site.
  if (request.headers.get('origin') !== new URL(request.url).origin ||
      request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Nepovolený pôvod požiadavky.' }, { status: 403 })
  }

  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return NextResponse.json({ error: 'Očakávaný formát JSON.' }, { status: 415 })
  }

  // Bound the request body before JSON parsing; do not hold unbounded data.
  const length = Number(request.headers.get('content-length'))
  if (Number.isFinite(length) && length > 2048) {
    return NextResponse.json({ error: 'Príliš veľa údajov.' }, { status: 413 })
  }
  const reader = request.body?.getReader()
  if (!reader) return NextResponse.json({ error: 'Chýbajú údaje.' }, { status: 400 })
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 2048) {
      await reader.cancel()
      return NextResponse.json({ error: 'Príliš veľa údajov.' }, { status: 413 })
    }
    chunks.push(value)
  }

  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      { error: 'Admin prístup nie je nakonfigurovaný.' },
      { status: 503 }
    )
  }

  let body: unknown
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return NextResponse.json({ error: 'Neplatný JSON.' }, { status: 400 }) }
  const payload = body && typeof body === 'object' ? body as { password?: unknown } : null
  const password = typeof payload?.password === 'string' ? payload.password : ''

  if (!isCorrectAdminPassword(password)) {
    await new Promise(resolve => setTimeout(resolve, 350))
    return NextResponse.json({ error: 'Nesprávne heslo.' }, { status: 401 })
  }

  const session = await createAdminSession()
  const response = NextResponse.json({ ok: true })

  response.cookies.set(ADMIN_COOKIE, session.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: session.maxAge,
  })

  return response
}
