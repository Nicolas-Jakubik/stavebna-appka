const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const source = file => fs.readFileSync(path.join(root, file), 'utf8')

test('deprecated client-side password gate and mutable adminStore are removed', () => {
  assert.equal(fs.existsSync(path.join(root, 'components/PasswordProtect.tsx')), false)
  assert.equal(fs.existsSync(path.join(root, 'lib/store.ts')), false)
  assert.doesNotMatch(source('app/page.tsx'), /adminStore|PasswordProtect/)
})

test('actual admin and recorder access must still be enforced by server session endpoints', () => {
  const proxy = source('proxy.ts')
  const admin = source('app/api/admin/database/[table]/route.ts')
  const recorder = source('app/api/recorder/database/[table]/route.ts')
  const home = source('app/page.tsx')
  assert.match(proxy, /verifyAdminSession/)
  assert.match(admin, /verifyAdminSession/)
  assert.match(recorder, /hasRecorderAccess/)
  assert.match(recorder, /verifyRecorderToken/)
  assert.match(home, /<RecorderGate>/)
})
