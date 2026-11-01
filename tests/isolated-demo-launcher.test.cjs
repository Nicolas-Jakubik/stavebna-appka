const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const launcher = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'run-isolated-design-demo.cjs'), 'utf8')

function simulate(env, envFilePresent = false) {
  let spawned = null
  const mockChild = { on() { return this }, kill() { return true } }
  const mockRequire = function(name) {
    if (name === 'node:fs') return { existsSync: () => envFilePresent }
    if (name === 'node:path') return require('node:path')
    if (name === 'node:child_process') return {
      spawn(command, argv, options) { spawned = { command, argv, options }; return mockChild },
    }
    throw Error('Unexpected module ' + name)
  }
  mockRequire.resolve = name => {
    assert.equal(name, 'next/dist/bin/next')
    return '/fake/node_modules/next/dist/bin/next'
  }
  const fakeProcess = {
    env: { ...env },
    on() {},
    exit(code) { throw Error('EXIT:' + code) },
    stdout: {},
  }
  vm.runInNewContext(launcher, {
    require: mockRequire,
    process: fakeProcess,
    __dirname: path.resolve(__dirname, '..', 'scripts'),
    console: { log() {}, error() {} },
  }, { filename: 'run-isolated-design-demo.cjs' })
  return spawned
}

test('local UI preview rejects checkout with .env files to prevent dotenv loading', () => {
  assert.throws(() => simulate({}, true), /EXIT:1/)
})

test('local UI preview scrubs all database, Supabase, admin and session secrets', () => {
  const spawned = simulate({
    SUPABASE_SERVICE_ROLE_KEY: 'must-not-survive',
    NEXT_PUBLIC_SUPABASE_URL: 'https://production.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'must-not-survive',
    ADMIN_PASSWORD: 'must-not-survive',
    RECORDER_SESSION_SECRET: 'must-not-survive',
    SD_EVIDENCIA_STAGING_DB_REF: 'must-not-survive',
    ANY_OTHER_DATABASE_TOKEN: 'must-not-survive',
    VERCEL_ENV: 'production',
    MY_UNRELATED_SETTING: 'allowed',
  })
  assert.ok(spawned, 'Next.js should be launched after validation')
  assert.equal(spawned.command, process.execPath)
  assert.equal(spawned.argv[0], '/fake/node_modules/next/dist/bin/next')
  assert.equal(spawned.options.shell, false)
  const safe = spawned.options.env
  assert.equal(safe.VERCEL_ENV, 'preview')
  assert.equal(safe.MY_UNRELATED_SETTING, 'allowed')
  assert.equal(safe.NEXT_PUBLIC_SUPABASE_URL, 'https://no-database.invalid')
  assert.equal(safe.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'demo-placeholder-not-a-secret')
  for (const key of [
    'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_PASSWORD', 'RECORDER_SESSION_SECRET',
    'SD_EVIDENCIA_STAGING_DB_REF', 'ANY_OTHER_DATABASE_TOKEN',
  ]) assert.equal(safe[key], undefined, key)
})

test('local UI preview rejects privileged ports and invalid port values', () => {
  for (const value of ['80', '65536', 'abc']) {
    assert.throws(() => simulate({ SD_DEMO_PORT: value }), /EXIT:1/)
  }
})
