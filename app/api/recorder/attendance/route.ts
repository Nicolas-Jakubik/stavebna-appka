import { NextRequest } from 'next/server'
import { serverDatabase } from '../../../../lib/serverDatabase'
import { ADMIN_COOKIE, verifyAdminSession } from '../../../../lib/adminSession'

export const dynamic = 'force-dynamic'
const noStore = { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' }

function fail(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: noStore })
}
function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(value + 'T12:00:00Z')
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
}
function validTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/.test(value)
}
async function isAdmin(req: NextRequest) {
  return verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value)
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  if (!validDate(date) || [...request.nextUrl.searchParams.keys()].some(k => k !== 'date')) {
    return fail(400, 'Vyberte platný dátum.')
  }
  try {
    const database = serverDatabase()
    const [attendance, administrator] = await Promise.all([
      database.from('dochadzka')
        .select('id,meno,datum,zakazka,objekt_id,prichod,odchod,created_at,edit_revision,edit_locked,edited_at,edited_by')
        .eq('datum', date)
        .order('meno', { ascending: true })
        .order('id', { ascending: true })
        .limit(501),
      isAdmin(request),
    ])
    if (attendance.error) return fail(503, 'Zápisy sa nepodarilo načítať.')
    const rows = attendance.data ?? []
    // Fail closed: never show a misleading partial daily roster.
    if (rows.length > 500) return fail(409, 'Príliš veľa zápisov pre jeden deň. Kontaktujte správcu.')
    const ids = rows.map(r => r.id)
    let history: unknown[] = []
    if (ids.length) {
      const audit = await database.from('dochadzka_zmeny')
        .select('id,dochadzka_id,changed_at,actor_label,actor_kind,old_values,new_values,revision')
        .in('dochadzka_id', ids)
        .order('changed_at', { ascending: false })
        .limit(501)
      if (audit.error || (audit.data?.length ?? 0) > 500) {
        return fail(503, 'Históriu zmien sa nepodarilo kompletne načítať.')
      }
      history = audit.data ?? []
    }
    return Response.json({ rows, history, isAdmin: administrator }, { headers: noStore })
  } catch {
    return fail(503, 'Kontrola zápisov je dočasne nedostupná.')
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin ||
      request.headers.get('sec-fetch-site') === 'cross-site') {
    return fail(403, 'Nepovolený pôvod požiadavky.')
  }
  if (!request.headers.get('content-type')?.startsWith('application/json')) {
    return fail(415, 'Očakávaný formát JSON.')
  }
  let raw = ''
  try {
    const reader = request.body?.getReader()
    if (!reader) return fail(400, 'Chýbajú údaje.')
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      raw += new TextDecoder().decode(value)
      if (raw.length > 4096) {
        await reader.cancel()
        return fail(413, 'Požiadavka je príliš veľká.')
      }
    }
    const obj: unknown = JSON.parse(raw)
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return fail(400, 'Neplatná oprava.')
    const v = obj as Record<string, unknown>
    const allowed = ['id', 'revision', 'actor', 'prichod', 'odchod', 'zakazka', 'objekt_id']
    if (Object.keys(v).some(k => !allowed.includes(k))) return fail(400, 'Nepovolené polia.')
    if (!Number.isSafeInteger(v.id) || Number(v.id) <= 0 ||
      !Number.isSafeInteger(v.revision) || Number(v.revision) < 0 ||
      typeof v.actor !== 'string' || v.actor.trim().length < 1 || v.actor.trim().length > 60 ||
      typeof v.zakazka !== 'string' || !v.zakazka.trim() || v.zakazka.length > 300 ||
      !validTime(v.prichod) || !validTime(v.odchod) || v.prichod === v.odchod ||
      (v.objekt_id !== null && v.objekt_id !== undefined &&
        (!Number.isSafeInteger(v.objekt_id) || Number(v.objekt_id) <= 0))) {
      return fail(400, 'Skontrolujte meno zapisovateľa, stavbu a časy po 15 minútach.')
    }
    const administrator = await isAdmin(request)
    const db = serverDatabase()
    const { data, error } = await db.rpc('sd_edit_attendance', {
      p_id: v.id,
      p_revision: v.revision,
      p_actor: administrator ? 'Administrátor' : v.actor.trim(),
      p_prichod: v.prichod,
      p_odchod: v.odchod,
      p_zakazka: v.zakazka.trim(),
      p_objekt_id: v.objekt_id ?? null,
      p_admin: administrator,
    })
    if (error) {
      if (error.code === '23505') return fail(409, 'Čas sa prekrýva s iným zápisom pracovníka.')
      if (error.message.includes('stale_version') || error.code === '40001') {
        return fail(409, 'Záznam už niekto upravil. Obnovte zoznam a skontrolujte nový čas.')
      }
      if (error.message.includes('locked_by_admin')) return fail(423, 'Tento zápis uzamkol administrátor.')
      if (error.message.includes('outside_edit_window')) return fail(403, 'Starší zápis môže upraviť iba administrátor.')
      if (error.code === '22023') return fail(400, 'Skontrolujte stavbu, objekt a platné časy.')
      return fail(503, 'Opravu sa nepodarilo uložiť.')
    }
    return Response.json({ saved: true, result: data }, { headers: noStore })
  } catch {
    return fail(503, 'Opravu sa nepodarilo uložiť.')
  }
}
