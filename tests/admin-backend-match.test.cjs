// Synthetic tests ONLY. Do not use production env, credentials or database rows.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
}

const { NextRequest } = require('next/server')
const { GET } = require('../app/api/admin/backend-match/route.ts')
const { ADMIN_COOKIE, createAdminSession } = require('../lib/adminSession.ts')
const endpoint = 'https://example.test/api/admin/backend-match'

test('admin-only runtime probe is read-only, no-store and never exposes URL or secrets', async () => {
  const oldPass = process.env.ADMIN_PASSWORD
  const oldURL = process.env.NEXT_PUBLIC_SUPABASE_URL
  try {
    process.env.ADMIN_PASSWORD = 'SYNTHETIC-ONLY-PASSWORD-FOR-BACKEND-MATCH-TEST'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://pfbgzwehfzgmsqjykvkb.supabase.co'
    const anonymous = await GET(new NextRequest(endpoint))
    assert.equal(anonymous.status, 401)
    assert.doesNotMatch(await anonymous.text(), /supabase\.co/i)
    assert.equal(anonymous.headers.get('set-cookie'), null)

    const token = await createAdminSession()
    const request = () => new NextRequest(endpoint, {
      headers: { cookie: `${ADMIN_COOKIE}=${token.value}` },
    })
    const matched = await GET(request())
    assert.equal(matched.status, 200)
    assert.deepEqual(await matched.json(), { match: true })
    assert.match(matched.headers.get('cache-control') || '', /no-store/i)
    assert.equal(matched.headers.get('vary'), 'Cookie')
    assert.equal(matched.headers.get('set-cookie'), null)

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://another-fake-project.supabase.co'
    const mismatch = await GET(request())
    assert.equal(mismatch.status, 200)
    assert.deepEqual(await mismatch.json(), { match: false })

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://pfbgzwehfzgmsqjykvkb.supabase.co'
    const insecure = await GET(request())
    assert.deepEqual(await insecure.json(), { match: false })

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'not-a-url'
    const malformed = await GET(request())
    assert.equal(malformed.status, 503)
    assert.doesNotMatch(await malformed.text(), /supabase\.co/i)

    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    const missing = await GET(request())
    assert.equal(missing.status, 503)
    assert.doesNotMatch(await missing.text(), /supabase\.co/i)
  } finally {
    if (oldPass === undefined) delete process.env.ADMIN_PASSWORD
    else process.env.ADMIN_PASSWORD = oldPass
    if (oldURL === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL
    else process.env.NEXT_PUBLIC_SUPABASE_URL = oldURL
  }
})
