const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }
).outputText, filename)

const { datumNaSlovensku, mesiacNaSlovensku, denVTyzdniNaSlovensku, posunDatumNaSlovensku } = require('../lib/businessDate.ts')

test('Bratislava calendar day does not fall one day behind UTC after midnight', () => {
  const instant = new Date('2026-10-28T23:30:00.000Z')
  assert.equal(datumNaSlovensku(instant), '2026-10-29')
  assert.equal(mesiacNaSlovensku(instant), '2026-10')
})

test('payroll month uses Bratislava local month on New Year transition', () => {
  const instant = new Date('2026-12-31T23:15:00.000Z')
  assert.equal(datumNaSlovensku(instant), '2027-01-01')
  assert.equal(mesiacNaSlovensku(instant), '2027-01')
})

test('named timezone handles both winter and summer UTC offsets including DST shifts', () => {
  assert.equal(datumNaSlovensku(new Date('2026-01-31T23:30:00Z')), '2026-02-01')
  assert.equal(datumNaSlovensku(new Date('2026-07-31T22:30:00Z')), '2026-08-01')
  assert.equal(datumNaSlovensku(new Date('2026-03-28T22:30:00Z')), '2026-03-28')
  assert.equal(datumNaSlovensku(new Date('2026-03-29T22:30:00Z')), '2026-03-30')
})

test('attendance, project creation, dashboard and payroll no longer use UTC dates for today', () => {
  const entries = [
    ['app/dashboard/page.tsx', /datumNaSlovensku\(\)/],
    ['app/mzdy/page.tsx', /mesiacNaSlovensku\(\)/],
    ['app/zakazky/page.tsx', /datumNaSlovensku\(\)/],
    ['app/page.tsx', /datumNaSlovensku\(\)/],
  ]
  for (const [name, use] of entries) {
    const src = fs.readFileSync(path.join(__dirname, '..', name), 'utf8')
    assert.match(src, use, name)
    assert.doesNotMatch(src, /new Date\(\)\.toISOString\(\)(?:\.slice\(0,\s*7\)|\.split\('T'\)\[0\])/, name)
  }
})

test('company civil-date arithmetic survives leap years, DST and cross-month Mondays', () => {
  assert.equal(posunDatumNaSlovensku('2026-11-01', -6), '2026-10-26')
  assert.equal(posunDatumNaSlovensku('2026-03-29', -6), '2026-03-23')
  assert.equal(posunDatumNaSlovensku('2026-10-25', 1), '2026-10-26')
  assert.equal(posunDatumNaSlovensku('2026-12-31', 1), '2027-01-01')
  assert.equal(posunDatumNaSlovensku('2028-02-28', 1), '2028-02-29')
  assert.equal(posunDatumNaSlovensku('2028-03-01', -1), '2028-02-29')
  assert.equal(denVTyzdniNaSlovensku('2026-11-01'), 0)
  assert.equal(denVTyzdniNaSlovensku('2026-10-26'), 1)
  assert.equal(denVTyzdniNaSlovensku('2026-10-31'), 6)
})

test('company civil-date helpers fail closed for invalid dates and offsets', () => {
  assert.throws(() => posunDatumNaSlovensku('2026-02-29', 1))
  assert.throws(() => denVTyzdniNaSlovensku('2026-13-01'))
  assert.throws(() => posunDatumNaSlovensku('2026-10-29', 0.5))
  assert.throws(() => posunDatumNaSlovensku('not-date', 1))
})

test('recorder weekly range and dashboard yesterday/weekend use Slovakia civil dates', () => {
  const recorder = fs.readFileSync(path.join(__dirname, '../app/page.tsx'), 'utf8')
  const dashboard = fs.readFileSync(path.join(__dirname, '../app/dashboard/page.tsx'), 'utf8')
  assert.match(recorder, /denVTyzdniNaSlovensku\(dnes\)/)
  assert.match(recorder, /posunDatumNaSlovensku\(pondelok, 5\)/)
  assert.match(recorder, /posunDatumNaSlovensku\(pondelok, index\)/)
  assert.doesNotMatch(recorder, /new Date\(\)\.getDay\(\)|datumDoLocalString/)
  assert.match(dashboard, /denVTyzdniNaSlovensku\(datum\)/)
  assert.match(dashboard, /posunDatumNaSlovensku\(dnesText, -1\)/)
  assert.match(dashboard, /denVTyzdniNaSlovensku\(z\.datum\)/)
  assert.doesNotMatch(dashboard, /new Date\(z\.datum\)\.getDay\(\)|datumDoLocalString/)
})
