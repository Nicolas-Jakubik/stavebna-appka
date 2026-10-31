const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename
)
const { auditujSadzbyVyplat } = require('../lib/payrollRateAudit.ts')

test('historical raise differences are flagged, not re-priced', () => {
  const workers = [{ meno: 'Sample A', sadzba: 11 }, { meno: 'Sample B', sadzba: 10 }]
  const attendance = [
    { meno: 'Sample A', sadzba_snapshot: 10 },
    { meno: 'Sample A', sadzba_snapshot: '10.00' },
    { meno: 'Sample B', sadzba_snapshot: 10 },
  ]
  assert.deepEqual(auditujSadzbyVyplat(attendance, workers), {
    odlisneSadzby: 2,
    bezHistorickejSadzby: 0,
    bezPorovnatelnehoProfilu: 0,
  })
  assert.equal(attendance[0].sadzba_snapshot, 10)
})

test('legacy missing/invalid snapshot is flagged, never mistaken for explicit zero', () => {
  const entries = [
    { meno: 'Sample', sadzba_snapshot: null },
    { meno: 'Sample', sadzba_snapshot: '' },
    { meno: 'Sample', sadzba_snapshot: 'invalid' },
    { meno: 'Sample', sadzba_snapshot: 0 },
  ]
  assert.deepEqual(auditujSadzbyVyplat(entries, [{ meno: 'Sample', sadzba: 0 }]), {
    odlisneSadzby: 0,
    bezHistorickejSadzby: 3,
    bezPorovnatelnehoProfilu: 0,
  })
})

test('removed worker does not turn an already saved snapshot into a false rate mismatch', () => {
  const result = auditujSadzbyVyplat(
    [{ meno: 'Deleted', sadzba_snapshot: 8 }, { meno: 'Present', sadzba_snapshot: 8 }],
    [{ meno: 'Present', sadzba: 8 }]
  )
  assert.deepEqual(result, {
    odlisneSadzby: 0,
    bezHistorickejSadzby: 0,
    bezPorovnatelnehoProfilu: 1,
  })
})

test('only selected half-month is audited when caller passes selected rows', () => {
  const first = [{ meno: 'Sample', sadzba_snapshot: 8 }]
  const second = [{ meno: 'Sample', sadzba_snapshot: 10 }]
  const workers = [{ meno: 'Sample', sadzba: 10 }]
  assert.equal(auditujSadzbyVyplat(first, workers).odlisneSadzby, 1)
  assert.equal(auditujSadzbyVyplat(second, workers).odlisneSadzby, 0)
})

test('duplicate worker names never select an arbitrary current rate', () => {
  // The legacy attendance record has only a name, not a stable employee ID.
  // A duplicate profile is ambiguous even if a later profile has the same rate.
  const profiles = [
    { meno: 'Sample A', sadzba: 10 },
    { meno: 'Sample A', sadzba: 12 },
    { meno: 'Sample A', sadzba: 10 },
    { meno: 'Sample B', sadzba: 9 },
  ]
  const entries = [
    { meno: 'Sample A', sadzba_snapshot: 10 },
    { meno: 'Sample A', sadzba_snapshot: 12 },
    { meno: 'Sample B', sadzba_snapshot: 9 },
  ]
  assert.deepEqual(auditujSadzbyVyplat(entries, profiles), {
    odlisneSadzby: 0,
    bezHistorickejSadzby: 0,
    bezPorovnatelnehoProfilu: 2,
  })
  assert.equal(entries[0].sadzba_snapshot, 10)
})
