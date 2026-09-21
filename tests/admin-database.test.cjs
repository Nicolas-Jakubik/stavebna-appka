const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

// Load the real TypeScript handler without adding a test-runner dependency.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
}
const { NextRequest } = require('next/server')
const route = require('../app/api/admin/database/[table]/route.ts')
const { createAdminSession, ADMIN_COOKIE } = require('../lib/adminSession.ts')
const origin = 'https://app.example'
const context = table => ({ params: Promise.resolve({ table }) })

test('admin gateway security and PostgREST compatibility', async t => {
  process.env.ADMIN_PASSWORD = 'test-only-admin-password'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.example'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-server-key'
  const cookie = `${ADMIN_COOKIE}=${(await createAdminSession()).value}`
  const originalFetch = global.fetch
  let calls = []
  global.fetch = async (url, init) => {
    calls.push({ url: String(url), init })
    return new Response('[{"id":1}]', { headers: { 'content-type': 'application/json', 'content-range': '0-0/1' } })
  }
  const req = (method = 'GET', extra = {}, body, search = '') => new NextRequest(`${origin}/api/admin/database/dochadzka${search}`, {
    method, headers: { cookie, origin, 'content-type': 'application/json', ...extra }, body,
  })
  try {
    await t.test('missing, forged and expired sessions cannot reach database', async () => {
      for (const value of ['', `${ADMIN_COOKIE}=v1.9999999999.invalid`, `${ADMIN_COOKIE}=v1.1.invalid`]) {
        assert.equal((await route.GET(req('GET', { cookie: value }), context('dochadzka'))).status, 401)
      }
      assert.equal(calls.length, 0)
    })
    await t.test('cross-origin and origin-less writes are denied', async () => {
      for (const method of ['POST', 'PATCH', 'DELETE']) {
        for (const value of ['https://attacker.example', '']) {
          assert.equal((await route[method](req(method, { origin: value }, method === 'DELETE' ? undefined : '{}'), context('dochadzka'))).status, 403)
        }
      }
      assert.equal(calls.length, 0)
    })
    await t.test('unknown tables and RPC paths are denied', async () => {
      for (const table of ['secrets', 'rpc/function', '../auth/users']) {
        assert.equal((await route.GET(req(), context(table))).status, 404)
      }
      assert.equal(calls.length, 0)
    })
    await t.test('missing server key fails closed', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      assert.equal((await route.GET(req(), context('dochadzka'))).status, 503)
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-server-key'
      assert.equal(calls.length, 0)
    })
    await t.test('invalid and oversized bodies are rejected', async () => {
      assert.equal((await route.POST(req('POST', {}, 'invalid'), context('dochadzka'))).status, 400)
      assert.equal((await route.POST(req('POST', {}, JSON.stringify('x'.repeat(256 * 1024))), context('dochadzka'))).status, 413)
      assert.equal(calls.length, 0)
    })
    await t.test('read filters, counts and server-owned credentials are preserved', async () => {
      const response = await route.GET(req('GET', { authorization: 'Bearer attacker', apikey: 'attacker', 'accept-profile': 'private' }, undefined, '?select=meno&datum=eq.2026-09-20'), context('dochadzka'))
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), [{ id: 1 }])
      assert.equal(response.headers.get('content-range'), '0-0/1')
      assert.match(response.headers.get('cache-control'), /no-store/)
      assert.equal(calls.at(-1).url, 'https://database.example/rest/v1/dochadzka?select=meno&datum=eq.2026-09-20')
      assert.equal(calls.at(-1).init.headers.get('apikey'), 'test-only-server-key')
      assert.equal(calls.at(-1).init.headers.get('accept-profile'), 'public')
      assert.equal(response.headers.get('apikey'), null)
    })
    await t.test('finance tables are available only through the authenticated admin gateway', async () => {
      for (const table of ['financie_stavby', 'naklady_stavby', 'platby_stavby']) {
        const response = await route.GET(req(), context(table))
        assert.equal(response.status, 200)
        assert.equal(new URL(calls.at(-1).url).pathname, `/rest/v1/${table}`)
      }
    })
    await t.test('authenticated insert, update and delete reach the correct table', async () => {
      for (const method of ['POST', 'PATCH', 'DELETE']) {
        const body = method === 'DELETE' ? undefined : '[{"meno":"Test"}]'
        assert.equal((await route[method](req(method, {}, body, '?id=eq.1'), context('zamestnanci'))).status, 200)
        assert.equal(calls.at(-1).init.method, method)
        assert.equal(calls.at(-1).init.body, body)
        assert.equal(calls.at(-1).url, 'https://database.example/rest/v1/zamestnanci?id=eq.1')
      }
    })
    await t.test('database errors retain conflict codes and HEAD has no body', async () => {
      global.fetch = async () => Response.json({ code: '23505', message: 'duplicate' }, { status: 409 })
      const response = await route.POST(req('POST', {}, '{}'), context('dochadzka'))
      assert.equal(response.status, 409)
      assert.equal((await response.json()).code, '23505')
      global.fetch = async () => new Response(null, { status: 200 })
      assert.equal(await (await route.HEAD(req('HEAD'), context('dochadzka'))).text(), '')
    })
    await t.test('network failure returns a controlled error without secrets', async () => {
      global.fetch = async () => { throw new Error('private upstream detail') }
      const response = await route.GET(req(), context('dochadzka'))
      assert.equal(response.status, 502)
      assert.doesNotMatch(await response.text(), /private upstream|server-key/)
    })
    await t.test('real SDK routes reads and writes through same-origin API', async () => {
      calls = []
      global.fetch = async (url, init) => {
        calls.push({ url: String(url), init })
        return Response.json([{ id: 1 }])
      }
      const { supabase } = require('../lib/adminSupabase.ts')
      const result = await supabase.from('dochadzka').select('*').eq('id', 1)
      assert.equal(result.error, null)
      await supabase.from('zamestnanci').update({ sadzba: 10 }).eq('id', 1)
      assert.match(calls[0].url, /^\/api\/admin\/database\/dochadzka\?/)
      assert.equal(calls[1].init.method, 'PATCH')
      assert.equal(calls[0].init.credentials, 'same-origin')
      assert.equal(calls[0].init.headers.get('authorization'), null)
      assert.equal(calls[0].init.headers.get('apikey'), null)
    })
  } finally {
    global.fetch = originalFetch
  }
})
