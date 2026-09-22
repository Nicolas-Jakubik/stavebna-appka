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

const { vytvorUpozorneniaFaktur } = require('../lib/financeAlerts.ts')

test('vrati faktury po splatnosti a splatne do siedmich dni', () => {
  const result = vytvorUpozorneniaFaktur([
    { id: 1, datum_splatnosti: '2026-09-20', suma: 100, uhradene: false },
    { id: 2, datum_splatnosti: '2026-09-25', suma: 200, uhradene: false },
    { id: 3, datum_splatnosti: '2026-10-10', suma: 300, uhradene: false },
    { id: 4, datum_splatnosti: '2026-09-21', suma: 400, uhradene: true },
  ], '2026-09-22', 7)

  assert.equal(result.length, 2)
  assert.equal(result[0].stav, 'po_splatnosti')
  assert.equal(result[0].dniDoSplatnosti, -2)
  assert.equal(result[1].stav, 'splatne_coskor')
  assert.equal(result[1].dniDoSplatnosti, 3)
})

test('dnesna splatnost sa zobrazi ako splatna coskoro', () => {
  const [result] = vytvorUpozorneniaFaktur([
    { id: 1, datum_splatnosti: '2026-09-22', suma: 100, uhradene: false },
  ], '2026-09-22')

  assert.equal(result.stav, 'splatne_coskor')
  assert.equal(result.dniDoSplatnosti, 0)
})

test('nevrati uhradene faktury', () => {
  const result = vytvorUpozorneniaFaktur([
    { id: 1, datum_splatnosti: '2026-09-01', suma: 100, uhradene: true },
  ], '2026-09-22')

  assert.deepEqual(result, [])
})
