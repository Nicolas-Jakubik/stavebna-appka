const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
}

const { bratislavaDateKey, bratislavaMonthKey, jeNedela } = require('../lib/dateKeys.ts')

test('Bratislava date key respects local day after midnight', () => {
  const instant = new Date('2026-09-21T22:30:00.000Z')
  assert.equal(bratislavaDateKey(instant), '2026-09-22')
  assert.equal(bratislavaMonthKey(instant), '2026-09')
})

test('Bratislava date key handles winter offset', () => {
  const instant = new Date('2026-12-31T23:30:00.000Z')
  assert.equal(bratislavaDateKey(instant), '2027-01-01')
  assert.equal(bratislavaMonthKey(instant), '2027-01')
})

test('Sunday detection uses date key without browser timezone', () => {
  assert.equal(jeNedela('2026-09-20'), true)
  assert.equal(jeNedela('2026-09-21'), false)
})
