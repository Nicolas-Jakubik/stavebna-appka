import { NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  createAdminSession,
  isAdminPasswordConfigured,
  isCorrectAdminPassword,
} from '../../../../lib/adminSession'

export async function POST(request: Request) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      { error: 'Admin prístup nie je nakonfigurovaný.' },
      { status: 503 }
    )
  }

  const body = await request.json().catch(() => null)
  const password = typeof body?.password === 'string' ? body.password : ''

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
