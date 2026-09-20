import { NextRequest } from 'next/server'
import { ADMIN_COOKIE, verifyAdminSession } from '../../../../lib/adminSession'
import { createRecorderToken, RECORDER_TTL } from '../../../../lib/recorderSession'

export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' }
  if (!await verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return Response.json({ message: 'Prihláste sa do administrácie.' }, { status: 401, headers })
  }
  if (request.headers.get('origin') !== request.nextUrl.origin) {
    return Response.json({ message: 'Nepovolený pôvod požiadavky.' }, { status: 403, headers })
  }
  // Fragment is not sent to HTTP access logs or as a Referer.
  return Response.json({ link: `${request.nextUrl.origin}/#zapis=${createRecorderToken()}`, validDays: RECORDER_TTL / 86400 }, { headers })
}
