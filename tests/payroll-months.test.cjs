const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
}
const { mesiaceVyplat } = require('../lib/payrollMonths.ts')

test('payroll month picker includes all of 2026 and the complete upcoming year', () => {
  const options = mesiaceVyplat(new Date('2026-10-29T12:00:00Z'))
  assert.equal(options.length, 24)
  assert.deepEqual(options[0], { hodnota: '2026-01', nazov: 'Január 2026' })
  assert.deepEqual(options.at(-1), { hodnota: '2027-12', nazov: 'December 2027' })
  assert.equal(new Set(options.map(o => o.hodnota)).size, options.length)
})

test('payroll options roll into January 2028 using Bratislava midnight', () => {
  const options = mesiaceVyplat(new Date('2026-12-31T23:15:00Z'))
  assert.equal(options.length, 36)
  assert.ok(options.some(x => x.hodnota === '2027-01' && x.nazov === 'Január 2027'))
  assert.ok(options.some(x => x.hodnota === '2028-12' && x.nazov === 'December 2028'))
  assert.ok(options.some(x => x.hodnota === '2026-01'))
})

test('2029 payroll includes past 2026 data and current plus following year', () => {
  const options = mesiaceVyplat(new Date('2029-04-21T12:00:00Z'))
  assert.equal(options[0].hodnota, '2026-01')
  assert.equal(options.at(-1).hodnota, '2030-12')
  assert.ok(options.some(o => o.hodnota === '2029-04'))
})

test('payroll component renders dynamically generated months rather than fixed 2026 list', () => {
  const page = fs.readFileSync(path.join(__dirname, '../app/mzdy/page.tsx'), 'utf8')
  assert.match(page, /const zoznamMesiacov = mesiaceVyplat\(\)/)
  assert.match(page, /zoznamMesiacov\.map\(\(m\)/)
  assert.doesNotMatch(page, /hodnota: '2026-01', nazov: 'Január 2026'/)
})
