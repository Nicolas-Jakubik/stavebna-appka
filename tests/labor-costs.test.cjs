const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  module._compile(ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText, filename)
}

const {
  vypocitajNakladyPracovnikov,
  zhrnNakladyPracovnikovPodlaZakazky,
} = require('../lib/laborCosts.ts')

test('naklad pracovnika je cisty denny cas krat hodinova sadzba', () => {
  const zaznamy = [
    { id: 1, meno: 'Adam', datum: '2026-09-22', zakazka: 'Stavba A', prichod: '07:00', odchod: '18:00' },
  ]
  const polozky = vypocitajNakladyPracovnikov(zaznamy, [{ meno: 'Adam', sadzba: 10 }])

  assert.equal(polozky.length, 1)
  assert.equal(polozky[0].hodiny, 10.5)
  assert.equal(polozky[0].suma, 105)
})

test('pri dvoch stavbach v jeden den sa prestavka odpocita iba raz', () => {
  const zaznamy = [
    { id: 1, meno: 'Adam', datum: '2026-09-22', zakazka: 'Stavba A', prichod: '07:00', odchod: '10:00' },
    { id: 2, meno: 'Adam', datum: '2026-09-22', zakazka: 'Stavba B', prichod: '10:00', odchod: '13:00' },
  ]
  const polozky = vypocitajNakladyPracovnikov(zaznamy, [{ meno: 'Adam', sadzba: 10 }])
  const spolu = polozky.reduce((sum, polozka) => sum + polozka.suma, 0)

  assert.equal(spolu, 55)
})

test('suhrn rozdeluje naklady podla stavby', () => {
  const polozky = [
    { datum: '2026-09-22', meno: 'Adam', zakazka: 'A', hodiny: 5, sadzba: 10, suma: 50, maSadzbu: true },
    { datum: '2026-09-22', meno: 'Boris', zakazka: 'A', hodiny: 4, sadzba: 12, suma: 48, maSadzbu: true },
    { datum: '2026-09-22', meno: 'Adam', zakazka: 'B', hodiny: 2, sadzba: 10, suma: 20, maSadzbu: true },
  ]
  const mapa = zhrnNakladyPracovnikovPodlaZakazky(polozky)

  assert.equal(mapa.get('A').hodiny, 9)
  assert.equal(mapa.get('A').suma, 98)
  assert.equal(mapa.get('B').suma, 20)
})

test('pracovnik bez sadzby sa oznaci a nevytvori falosny naklad', () => {
  const zaznamy = [
    { id: 1, meno: 'Adam', datum: '2026-09-22', zakazka: 'A', prichod: '07:00', odchod: '12:00' },
  ]
  const polozky = vypocitajNakladyPracovnikov(zaznamy, [])
  const mapa = zhrnNakladyPracovnikovPodlaZakazky(polozky)

  assert.equal(polozky[0].suma, 0)
  assert.equal(polozky[0].maSadzbu, false)
  assert.equal(mapa.get('A').bezSadzby.has('Adam'), true)
})
