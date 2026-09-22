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

const {
  stavKlientskejFaktury,
  zhrnKlientskeFaktury,
} = require('../lib/clientInvoices.ts')

test('uhradena klientska faktura je prijata platba', () => {
  const result = zhrnKlientskeFaktury([
    { suma: 1250, uhradene: true, datum_splatnosti: '2026-09-10' },
  ], '2026-09-22')

  assert.deepEqual(result, {
    vyfakturovane: 1250,
    prijate: 1250,
    pohladavky: 0,
    poSplatnosti: 0,
    pocetPoSplatnosti: 0,
  })
})

test('neuhradena faktura sa pocita ako pohladavka', () => {
  const result = zhrnKlientskeFaktury([
    { suma: 500, uhradene: false, datum_splatnosti: '2026-09-30' },
  ], '2026-09-22')

  assert.equal(result.vyfakturovane, 500)
  assert.equal(result.prijate, 0)
  assert.equal(result.pohladavky, 500)
})

test('faktura po splatnosti sa zvyrazni', () => {
  assert.equal(stavKlientskejFaktury({
    datum_splatnosti: '2026-09-21',
    uhradene: false,
  }, '2026-09-22'), 'Po splatnosti')

  const result = zhrnKlientskeFaktury([
    { suma: 700, uhradene: false, datum_splatnosti: '2026-09-21' },
  ], '2026-09-22')

  assert.equal(result.poSplatnosti, 700)
  assert.equal(result.pocetPoSplatnosti, 1)
})
