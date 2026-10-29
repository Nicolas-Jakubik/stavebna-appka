import { NextResponse } from 'next/server'
import { ADMIN_COOKIE } from '../../../../lib/adminSession'

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin ||
      request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Nepovolený pôvod požiadavky.' }, { status: 403 })
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return response
}
