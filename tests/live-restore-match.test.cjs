const { test } = require('node:test')
const assert = require('node:assert/strict')
const { canonicalRow, sameRows } = require('../scripts/compare-live-restored-attendance.cjs')

const base = {
  meno: 'Synthetic Worker',
  zakazka: 'Synthetic Site',
  datum: '2026-09-02',
  prichod: '07:00',
  odchod: '19:00',
  objekt_id: null,
}
const second = {
  ...base,
  meno: 'Second Synthetic Worker',
  datum: '2026-09-04',
  objekt_id: 123,
}

test('compare immutable attendance rows as a multiset, not in query order', () => {
  assert.equal(sameRows([base, second], [second, base]), true)
  assert.equal(sameRows([base, base], [base, second]), false)
  assert.equal(sameRows([base, second], [base]), false)
})

test('normalization allows Postgres time precision and numeric ID serialization', () => {
  const normalized = {
    ...second,
    prichod: '07:00:00',
    odchod: '19:00:00',
    objekt_id: '123',
  }
  assert.equal(canonicalRow(second), canonicalRow(normalized))
  assert.equal(sameRows([second], [normalized]), true)
})

test('any meaningful historic data difference blocks a match', () => {
  for (const changed of [
    { ...base, zakazka: 'Different Site' },
    { ...base, prichod: '08:00' },
    { ...base, odchod: '18:45' },
    { ...base, datum: '2026-09-03' },
    { ...base, objekt_id: 12 },
    { ...base, meno: 'Different Worker' },
  ]) {
    assert.equal(sameRows([base], [changed]), false)
  }
  const missing = { ...base }
  delete missing.meno
  assert.throws(() => canonicalRow(missing), /Missing field/)
})
