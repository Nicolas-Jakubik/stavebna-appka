import { NextRequest } from 'next/server'
import { ADMIN_COOKIE, verifyAdminSession } from '../../../../lib/adminSession'

export const dynamic = 'force-dynamic'

const DOKLADO_API_BASE = 'https://api-gateway-prod-europe-west-1-7epuecvu.ew.gateway.dev'

function unauthorized() {
  return Response.json({ message: 'Prihláste sa do administrácie.' }, {
    status: 401,
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

function getConfig() {
  const apiKey = process.env.DOKLADO_API_KEY?.trim() || ''
  const organizationId = process.env.DOKLADO_ORGANIZATION_ID?.trim() || ''
  return { apiKey, organizationId, configured: Boolean(apiKey && organizationId) }
}

export async function GET(request: NextRequest) {
  if (!await verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return unauthorized()
  }

  const { configured } = getConfig()
  return Response.json({
    configured,
    provider: 'Doklado',
    requiredEnvironmentVariables: configured ? [] : ['DOKLADO_API_KEY', 'DOKLADO_ORGANIZATION_ID'],
  }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

export async function POST(request: NextRequest) {
  if (!await verifyAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) {
    return unauthorized()
  }
  if (request.headers.get('origin') !== request.nextUrl.origin ||
      request.headers.get('sec-fetch-site') === 'cross-site') {
    return Response.json({ message: 'Nepovolený pôvod požiadavky.' }, { status: 403 })
  }

  const { apiKey, organizationId, configured } = getConfig()
  if (!configured) {
    return Response.json({
      message: 'Doklado nie je pripojené. Nastavte DOKLADO_API_KEY a DOKLADO_ORGANIZATION_ID vo Verceli.',
      configured: false,
    }, { status: 409 })
  }

  let days = 90
  try {
    const body = await request.json()
    const parsed = Number(body?.days)
    if (Number.isFinite(parsed)) days = Math.max(1, Math.min(365, Math.floor(parsed)))
  } catch {
    // Telo je voliteľné.
  }

  const dateTo = new Date()
  const dateFrom = new Date(dateTo)
  dateFrom.setUTCDate(dateFrom.getUTCDate() - days)

  try {
    const response = await fetch(`${DOKLADO_API_BASE}/v2/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        api_key: apiKey,
      },
      body: JSON.stringify({
        data: {
          organizationId,
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
          dateType: 'create',
          orderBy: 'creation_date',
          orderByDescending: true,
          resourceTypes: ['invoice'],
          resourceSubType: ['received_invoice'],
        },
      }),
      cache: 'no-store',
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      console.error('Doklado API error:', response.status, payload)
      return Response.json({
        configured: true,
        connected: false,
        message: response.status === 403
          ? 'Doklado API kľúč nemá prístup k tejto firme alebo je neplatný.'
          : 'Spojenie s Doklado sa nepodarilo overiť.',
      }, { status: 502 })
    }

    if (payload?.success === false) {
      return Response.json({
        configured: true,
        connected: false,
        message: payload?.message || 'Doklado vrátilo chybu pri načítaní dokladov.',
        code: payload?.code || null,
      }, { status: 502 })
    }

    const documents = Array.isArray(payload?.data) ? payload.data : []

    return Response.json({
      configured: true,
      connected: true,
      foundDocuments: documents.length,
      days,
      hasMore: Boolean(payload?.continuationToken || (Array.isArray(payload?.searchAfter) && payload.searchAfter.length)),
      message: documents.length === 0
        ? `Spojenie funguje. Za posledných ${days} dní sa nenašli prijaté faktúry.`
        : `Spojenie funguje. Našlo sa ${documents.length} prijatých faktúr za posledných ${days} dní.`,
    }, {
      headers: { 'Cache-Control': 'private, no-store' },
    })
  } catch (error) {
    console.error('Doklado connection error:', error)
    return Response.json({
      configured: true,
      connected: false,
      message: 'Doklado API je momentálne nedostupné.',
    }, { status: 502 })
  }
}
