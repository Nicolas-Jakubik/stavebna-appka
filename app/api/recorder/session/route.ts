import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, verifyAdminSession } from '../../../../lib/adminSession'
import { RECORDER_COOKIE, verifyRecorderToken } from '../../../../lib/recorderSession'

const headers = { 'Cache-Control': 'private, no-store' }
export async function GET(request: NextRequest) {
  const valid = verifyRecorderToken(request.cookies.get(RECORDER_COOKIE)?.value) ||
    await verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)
  return Response.json({ authorized: valid }, { status: valid ? 200 : 401, headers })
}

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return Response.json({ message: 'Nepovolený pôvod požiadavky.' }, { status: 403, headers })
  }
  if (Number(request.headers.get('content-length')) > 1024) return new Response(null, { status: 413, headers })
  let token: unknown
  try {
    const reader = request.body?.getReader()
    if (!reader) return new Response(null, { status: 400, headers })
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 1024) { await reader.cancel(); return new Response(null, { status: 413, headers }) }
      chunks.push(value)
    }
    token = JSON.parse(Buffer.concat(chunks).toString('utf8')).token
  } catch { return new Response(null, { status: 400, headers }) }
  if (typeof token !== 'string' || !verifyRecorderToken(token)) {
    return Response.json({ message: 'Odkaz je neplatný alebo jeho platnosť skončila.' }, { status: 401, headers })
  }
  const response = NextResponse.json({ authorized: true }, { headers })
  response.cookies.set(RECORDER_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/',
    maxAge: Math.max(0, Number(token.split('.')[1]) - Math.floor(Date.now() / 1000)),
  })
  return response
}
