#!/usr/bin/env node
'use strict'

// Run design-preview pages locally without loading confidential credentials or
// allowing any admin/recorder API access to a real database.
//
// Keep this command separate from the regular development and production flows.
const { existsSync } = require('node:fs')
const { join } = require('node:path')
const { spawn } = require('node:child_process')

const root = join(__dirname, '..')
const envFiles = [
  '.env', '.env.local', '.env.development', '.env.development.local',
  '.env.production', '.env.production.local', '.env.test', '.env.test.local',
]
const present = envFiles.filter(name => existsSync(join(root, name)))
if (present.length) {
  console.error('[SD Evidencia] Bezpečná ukážka nespustená.')
  console.error('V koreňovom priečinku existuje konfiguračný .env súbor.')
  console.error('Spustenie by mohlo načítať prihlasovacie alebo databázové údaje.')
  console.error('Použi samostatnú čistú pracovnú kópiu bez .env súborov.')
  process.exit(1)
}

const env = { ...process.env }
for (const name of Object.keys(env)) {
  if (
    /SUPABASE/i.test(name) ||
    /DATABASE/i.test(name) ||
    /ADMIN_PASSWORD/i.test(name) ||
    /SESSION_SECRET/i.test(name) ||
    /^VERCEL_/i.test(name) ||
    /SD_EVIDENCIA_STAGING/i.test(name)
  ) delete env[name]
}
env.VERCEL_ENV = 'preview'
// Valid-looking but unreachable demonstration URL. This is NOT a real database.
// Database gateways still reject every request because staging DB ref is absent.
env.NEXT_PUBLIC_SUPABASE_URL = 'https://no-database.invalid'
env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'demo-placeholder-not-a-secret'
delete env.SD_EVIDENCIA_STAGING_DB_REF
delete env.SUPABASE_SERVICE_ROLE_KEY

const port = Number(process.env.SD_DEMO_PORT || 3001)
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error('Neplatný SD_DEMO_PORT (povolené porty 1024–65535).')
  process.exit(1)
}

const nextBin = require.resolve('next/dist/bin/next')
console.log('[SD Evidencia] Spúšťam izolovanú, nezapisovateľnú ukážku.')
console.log(`[SD Evidencia] Otvor http://localhost:${port}/design-preview`)
console.log('Na tejto adrese neupravuj firemné údaje; zobrazujú sa iba fiktívne návrhy.')
const child = spawn(process.execPath, [nextBin, 'dev', '--port', String(port)], {
  cwd: root, env, stdio: 'inherit', shell: false,
})
child.on('error', error => {
  console.error('Spustenie zlyhalo:', error.message)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  if (signal) process.exitCode = 1
  else process.exitCode = code || 0
})
process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))
