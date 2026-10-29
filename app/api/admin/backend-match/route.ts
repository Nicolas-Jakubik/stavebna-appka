import { NextRequest } from 'next/server'
import { ADMIN_COOKIE, verifyAdminSession } from '../../../../lib/adminSession'

// Single-purpose read-only diagnostic; NO database connection or service-role key.
// This PR is NOT authorized for Production deployment without separate approval.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EXPECTED_HOST = 'pfbgzwehfzgmsqjykvkb.supabase.co'
const HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Vary: 'Cookie',
  'X-Content-Type-Options': 'nosniff',
}

export async function GET(request: NextRequest) {
  if (!await verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return Response.json({ error: 'Prihláste sa do administrácie.' }, {
      status: 401, headers: HEADERS,
    })
  }

  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!configured) {
    return Response.json({ error: 'Konfigurácia databázy nie je dostupná.' }, {
      status: 503, headers: HEADERS,
    })
  }

  try {
    const parsed = new URL(configured)
    // Compare ONLY the actual runtime destination hostname. Neither the URL
    // nor any secret, employee data or database row is ever returned.
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password ||
        parsed.port || parsed.pathname !== '/' || parsed.search || parsed.hash) {
      return Response.json({ match: false }, { headers: HEADERS })
    }
    return Response.json({ match: parsed.hostname === EXPECTED_HOST }, {
      headers: HEADERS,
    })
  } catch {
    return Response.json({ error: 'Neplatná konfigurácia databázy.' }, {
      status: 503, headers: HEADERS,
    })
  }
}
