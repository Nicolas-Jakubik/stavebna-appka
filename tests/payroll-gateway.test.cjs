const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }
).outputText, filename)

const { NextRequest } = require('next/server')
const route = require('../app/api/admin/database/[table]/route.ts')
const { createAdminSession, ADMIN_COOKIE } = require('../lib/adminSession.ts')
const { nacitajVsetkyStrany } = require('../lib/paginatedRows.ts')
const { vypocitajNakladyPracovnikov } = require('../lib/laborCosts.ts')
const { hodinyZaznamuZMapy, vytvorMapuCistychHodin } = require('../lib/workHours.ts')
const { hodinovaSadzbaZaznamu } = require('../lib/hourlyRates.ts')
const { supabase } = require('../lib/adminSupabase.ts')

test('authenticated payroll gateway reads 1,203 attendances and 1,007 worker rates without truncation', async () => {
  process.env.ADMIN_PASSWORD = 'fake-test-only-payroll-password'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.example'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-test-only-database-key'

  const origin = 'https://app.example'
  const cookie = ADMIN_COOKIE + '=' + (await createAdminSession()).value
  const workers = Array.from({ length: 1007 }, (_, i) => ({
    id: i + 1, meno: 'Worker ' + String(i+1).padStart(4, '0'), sadzba: 20,
  }))
  const attendance = Array.from({ length: 1203 }, (_, i) => ({
    id: i + 1,
    meno: workers[i % workers.length].meno,
    zakazka: 'Test project',
    datum: i < workers.length ? '2026-10-03' : '2026-10-04',
    prichod: '07:00',
    odchod: '19:00',
    sadzba_snapshot: i % 2 === 0 ? 10 : null,
  }))
  const pageOffsets = { dochadzka: [], zamestnanci: [] }
  const original = global.fetch
  let failSecondWorkerPage = false

  global.fetch = async (input, init) => {
    const value = String(input)
    if (value.startsWith('/api/admin/database/')) {
      const url = new URL(value, origin)
      const table = url.pathname.split('/').at(-1)
      const request = new NextRequest(url.href, { headers: { cookie, origin } })
      return route.GET(request, { params: Promise.resolve({ table }) })
    }
    const url = new URL(value)
    assert.equal(url.origin, 'https://database.example')
    const table = url.pathname.split('/').at(-1)
    assert.ok(table === 'dochadzka' || table === 'zamestnanci')
    const offset = Number(url.searchParams.get('offset'))
    const limit = Number(url.searchParams.get('limit'))
    assert.equal(url.searchParams.get('order'), 'id.asc')
    assert.equal(limit, 500)
    pageOffsets[table].push(offset)
    if (table === 'zamestnanci' && failSecondWorkerPage && offset === 500) {
      return Response.json({ code: 'PGRST_ERROR', message: 'simulated failure' }, { status: 503 })
    }
    const source = table === 'dochadzka' ? attendance : workers
    return Response.json(source.slice(offset, offset + limit), {
      headers: { 'content-range': offset + '-' + Math.min(offset + limit - 1, source.length - 1) + '/' + source.length },
    })
  }

  const read = (table) => nacitajVsetkyStrany(async (start, end) => {
    const query = supabase.from(table).select('*').order('id', { ascending: true })
    if (table === 'dochadzka') query.gte('datum', '2026-10-01').lte('datum', '2026-10-31')
    const { data, error } = await query.range(start, end)
    return { data, error }
  })

  try {
    const [att, people] = await Promise.all([read('dochadzka'), read('zamestnanci')])
    assert.equal(att.error, null)
    assert.equal(people.error, null)
    assert.equal(att.data.length, 1203)
    assert.equal(people.data.length, 1007)
    assert.deepEqual(pageOffsets.dochadzka, [0, 500, 1000])
    assert.deepEqual(pageOffsets.zamestnanci, [0, 500, 1000])

    const map = vytvorMapuCistychHodin(att.data)
    const rates = new Map(people.data.map(w => [w.meno, w.sadzba]))
    const totalHours = att.data.reduce((n, row) => n + hodinyZaznamuZMapy(row, map), 0)
    const totalPay = att.data.reduce((n, row) => n +
      hodinyZaznamuZMapy(row, map) * hodinovaSadzbaZaznamu(row.sadzba_snapshot, rates.get(row.meno)), 0)
    assert.equal(totalHours, 1203 * 11.5)
    assert.equal(totalPay, (602 * 10 + 601 * 20) * 11.5)
    const finance = vypocitajNakladyPracovnikov(att.data, people.data)
    assert.equal(finance.length, 1203)
    assert.equal(finance.reduce((n, r) => n + r.suma, 0), totalPay)

    failSecondWorkerPage = true
    const failedPeople = await read('zamestnanci')
    assert.equal(failedPeople.data, null)
    assert.ok(failedPeople.error)
    assert.equal(pageOffsets.zamestnanci.at(-1), 500)
  } finally {
    global.fetch = original
  }
})
