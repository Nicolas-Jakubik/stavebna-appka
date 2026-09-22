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

const { vypocitajZiskovost } = require('../lib/profitability.ts')

test('vypocita planovany zisk a marzu', () => {
  const result = vypocitajZiskovost({
    cenaZakazky: 100000,
    budgetNakladov: 80000,
    aktualneNaklady: 50000,
  })

  assert.equal(result.planovanyZisk, 20000)
  assert.equal(result.planovanaMarzaPercent, 20)
  assert.equal(result.aktualnaRezerva, 50000)
  assert.equal(result.odchylkaOdBudgetu, 30000)
})

test('prekrocenie budgetu ma zapornu odchylku', () => {
  const result = vypocitajZiskovost({
    cenaZakazky: 100000,
    budgetNakladov: 80000,
    aktualneNaklady: 90000,
  })

  assert.equal(result.odchylkaOdBudgetu, -10000)
  assert.equal(result.odchylkaOdBudgetuPercent, -12.5)
})

test('progress fakturacie a inkasa sa rata z ceny zakazky', () => {
  const result = vypocitajZiskovost({
    cenaZakazky: 100000,
    budgetNakladov: 80000,
    aktualneNaklady: 50000,
    vyfakturovane: 60000,
    prijate: 40000,
  })

  assert.equal(result.fakturacnyProgressPercent, 60)
  assert.equal(result.inkasnyProgressPercent, 40)
})

test('pri nulovej cene nevytvara nezmyselne percenta', () => {
  const result = vypocitajZiskovost({
    cenaZakazky: 0,
    budgetNakladov: 0,
    aktualneNaklady: 0,
  })

  assert.equal(result.planovanaMarzaPercent, null)
  assert.equal(result.aktualnaRezervaPercent, null)
  assert.equal(result.fakturacnyProgressPercent, null)
  assert.equal(result.inkasnyProgressPercent, null)
})
