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

const { vytvorMesacnyRozpadNakladov } = require('../lib/financeBreakdown.ts')

test('spoji rucne naklady a pracovnikov do jedneho mesacneho prehladu', () => {
  const result = vytvorMesacnyRozpadNakladov(
    [
      { datum: '2026-09-02', kategoria: 'Materiál', suma: 500 },
      { datum: '2026-09-10', kategoria: 'Mechanizácia', suma: 120 },
    ],
    [
      { datum: '2026-09-05', suma: 300 },
      { datum: '2026-09-06', suma: 200 },
    ]
  )

  assert.equal(result.length, 1)
  assert.equal(result[0].categories['Pracovníci'], 500)
  assert.equal(result[0].categories['Materiál'], 500)
  assert.equal(result[0].categories['Mechanizácia'], 120)
  assert.equal(result[0].total, 1120)
})

test('mesiace su zoradene od najnovsieho', () => {
  const result = vytvorMesacnyRozpadNakladov(
    [
      { datum: '2026-08-01', kategoria: 'Materiál', suma: 10 },
      { datum: '2026-10-01', kategoria: 'Materiál', suma: 20 },
      { datum: '2026-09-01', kategoria: 'Materiál', suma: 30 },
    ],
    []
  )

  assert.deepEqual(result.map(row => row.key), ['2026-10', '2026-09', '2026-08'])
})

test('nezname kategorie zaradi do ostatnych', () => {
  const result = vytvorMesacnyRozpadNakladov(
    [{ datum: '2026-09-01', kategoria: 'Neznáme', suma: 42 }],
    []
  )

  assert.equal(result[0].categories['Ostatné'], 42)
  assert.equal(result[0].total, 42)
})
