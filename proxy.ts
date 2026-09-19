import { NextRequest, NextResponse } from 'next/server'
import { ADMIN_COOKIE, verifyAdminSession } from './lib/adminSession'

const ADMIN_PATHS = ['/dashboard', '/zakazky', '/zamestnanci', '/mzdy']

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAdminPath = ADMIN_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'))

  if (!isAdminPath) return NextResponse.next()

  const session = request.cookies.get(ADMIN_COOKIE)?.value
  const isValid = await verifyAdminSession(session)

  if (isValid) return NextResponse.next()

  const loginUrl = new URL('/admin-prihlasenie', request.url)
  loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/dashboard/:path*', '/zakazky/:path*', '/zamestnanci/:path*', '/mzdy/:path*'],
}
