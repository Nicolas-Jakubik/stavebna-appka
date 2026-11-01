const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

// Exercise the same TypeScript handlers that are deployed by Next.js.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
}

const { NextRequest } = require('next/server')
const { previewDatabaseIsIsolated } = require('../lib/previewDatabaseIsolation.ts')
const admin = require('../app/api/admin/database/[table]/route.ts')
const recorder = require('../app/api/recorder/database/[table]/route.ts')
const { createAdminSession, ADMIN_COOKIE } = require('../lib/adminSession.ts')

const STAGING_REF = 'abcdabcdabcdabcdabcd'
const LIVE_REF = 'pfbgzwehfzgmsqjykvkb'
const origin = 'https://staging.example'
const ctx = table => ({ params: Promise.resolve({ table }) })
const previous = {}

const envKeys = [
  'VERCEL_ENV', 'ADMIN_PASSWORD', 'SD_EVIDENCIA_STAGING_DB_REF',
  'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
]
for (const key of envKeys) previous[key] = process.env[key]

function resetVars() {
  process.env.VERCEL_ENV = 'preview'
  process.env.ADMIN_PASSWORD = 'fake-preview-test-only-password'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-preview-test-only-server-key'
  delete process.env.SD_EVIDENCIA_STAGING_DB_REF
  process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${LIVE_REF}.supabase.co`
}

test('unisolated preview DB fails closed across admin + anonymous recorder', async t => {
  const originalFetch = global.fetch
  let dbRequests = 0
  global.fetch = async () => {
    dbRequests++
    return Response.json([])
  }
  resetVars()

  function request(path, method = 'GET', cookie = '', body) {
    return new NextRequest(origin + path, {
      method,
      headers: { origin, cookie, 'content-type': 'application/json' },
      body,
    })
  }

  try {
    const cookie = `${ADMIN_COOKIE}=${(await createAdminSession()).value}`
    const aRead = () => admin.GET(request('/api/admin/database/dochadzka', 'GET', cookie), ctx('dochadzka'))
    const rRead = () => recorder.GET(request('/api/recorder/database/zamestnanci?select=meno,aktivny'), ctx('zamestnanci'))
    const rWrite = () => recorder.POST(request('/api/recorder/database/dochadzka', 'POST', '', JSON.stringify([{meno:'Test'}])), ctx('dochadzka'))

    await t.test('unset marker blocks all database operations, even with a configured admin key', async () => {
      assert.equal(previewDatabaseIsIsolated(), false)
      assert.equal((await aRead()).status, 503)
      assert.equal((await rRead()).status, 503)
      assert.equal((await rWrite()).status, 503)
      assert.equal(dbRequests, 0)
    })

    await t.test('a marker pointing at the known company production project is rejected', async () => {
      process.env.SD_EVIDENCIA_STAGING_DB_REF = LIVE_REF
      process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${LIVE_REF}.supabase.co`
      assert.equal(previewDatabaseIsIsolated(), false)
      assert.equal((await aRead()).status, 503)
      assert.equal((await rWrite()).status, 503)
      assert.equal(dbRequests, 0)
    })

    await t.test('mismatching marker, invalid URLs and lookalike hosts are denied', async () => {
      process.env.SD_EVIDENCIA_STAGING_DB_REF = STAGING_REF
      for (const url of [
        `https://${LIVE_REF}.supabase.co`,
        `https://${STAGING_REF}.supabase.co.evil.example`,
        `http://${STAGING_REF}.supabase.co`,
        `https://${STAGING_REF}.supabase.co/rest/v1`,
        'not a valid URL',
      ]) {
        process.env.NEXT_PUBLIC_SUPABASE_URL = url
        assert.equal(previewDatabaseIsIsolated(), false, url)
        assert.equal((await rRead()).status, 503)
      }
      assert.equal(dbRequests, 0)
    })

    await t.test('explicit, distinct, correctly matched staging database can be accessed', async () => {
      process.env.SD_EVIDENCIA_STAGING_DB_REF = STAGING_REF
      process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${STAGING_REF}.supabase.co`
      assert.equal(previewDatabaseIsIsolated(), true)
      assert.equal((await aRead()).status, 200)
      assert.equal((await rRead()).status, 200)
      assert.equal(dbRequests, 2)
    })

    await t.test('production and local existing behavior are unchanged by preview guard', () => {
      delete process.env.SD_EVIDENCIA_STAGING_DB_REF
      process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${LIVE_REF}.supabase.co`
      process.env.VERCEL_ENV = 'production'
      assert.equal(previewDatabaseIsIsolated(), true)
      delete process.env.VERCEL_ENV
      assert.equal(previewDatabaseIsIsolated(), true)
      assert.equal(dbRequests, 2)
    })
  } finally {
    global.fetch = originalFetch
    for (const [name, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
})
