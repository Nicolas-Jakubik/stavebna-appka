import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, verifyAdminSession } from '../../../../lib/adminSession'
import {
  RECORDER_COOKIE, RECORDER_TTL, createRecorderToken, renewRecorderToken,
  verifyRecorderActivationToken, verifyRecorderToken,
} from '../../../../lib/recorderSession'

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' }

function setRecorderCookie(response: NextResponse, token: string) {
  response.cookies.set(RECORDER_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', path: '/', maxAge: RECORDER_TTL,
  })
}

export async function GET(request: NextRequest) {
  const recorder = request.cookies.get(RECORDER_COOKIE)?.value
  if (verifyRecorderToken(recorder)) {
    const response = NextResponse.json({ authorized: true }, { headers })
    const renewed = renewRecorderToken(recorder)
    if (renewed) setRecorderCookie(response, renewed)
    return response
  }
  const validAdmin = await verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)
  return Response.json({ authorized: validAdmin }, { status: validAdmin ? 200 : 401, headers })
}

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin ||
      request.headers.get('sec-fetch-site') === 'cross-site') {
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
  if (typeof token !== 'string' || !verifyRecorderActivationToken(token)) {
    return Response.json({ message: 'Aktivačný odkaz je neplatný alebo jeho platnosť skončila.' }, { status: 401, headers })
  }
  const response = NextResponse.json({ authorized: true }, { headers })
  setRecorderCookie(response, createRecorderToken())
  return response
}
