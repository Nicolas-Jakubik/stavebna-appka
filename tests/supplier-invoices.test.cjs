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
  stavDodavatelskejFaktury,
  zhrnDodavatelskeFaktury,
  fakturyAkoNaklady,
} = require('../lib/supplierInvoices.ts')

test('uhradena faktura nema stav po splatnosti', () => {
  assert.equal(stavDodavatelskejFaktury({
    datum_splatnosti: '2026-09-01',
    uhradene: true,
  }, '2026-09-22'), 'Uhradená')
})

test('neuhradena faktura po splatnosti sa oznaci', () => {
  assert.equal(stavDodavatelskejFaktury({
    datum_splatnosti: '2026-09-21',
    uhradene: false,
  }, '2026-09-22'), 'Po splatnosti')
})

test('suhrn oddeli uhradene, neuhradene a po splatnosti', () => {
  const result = zhrnDodavatelskeFaktury([
    { suma: 100, uhradene: true, datum_splatnosti: '2026-09-10' },
    { suma: 200, uhradene: false, datum_splatnosti: '2026-09-20' },
    { suma: 300, uhradene: false, datum_splatnosti: '2026-09-30' },
  ], '2026-09-22')

  assert.deepEqual(result, {
    spolu: 600,
    uhradene: 100,
    neuhradene: 500,
    poSplatnosti: 200,
    pocetPoSplatnosti: 1,
  })
})

test('faktury sa prevedu do mesacneho rozpadu podla datumu vystavenia', () => {
  assert.deepEqual(fakturyAkoNaklady([
    { datum_vystavenia: '2026-09-03', kategoria: 'Materiál', suma: '125.50' },
  ]), [
    { datum: '2026-09-03', kategoria: 'Materiál', suma: 125.5 },
  ])
})
