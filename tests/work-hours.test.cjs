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
  vypocitajTrvanieUsekuHodiny,
  vypocitajHodinyJednehoUseku,
  vytvorMapuCistychHodin,
  hodinyZaznamuZMapy,
} = require('../lib/workHours.ts')

function sucet(zaznamy) {
  const mapa = vytvorMapuCistychHodin(zaznamy)
  return zaznamy.reduce((spolu, z) => spolu + hodinyZaznamuZMapy(z, mapa), 0)
}

test('jeden dlhy usek ma jednu 30-minutovu prestavku', () => {
  assert.equal(vypocitajTrvanieUsekuHodiny('07:00', '18:00'), 11)
  assert.equal(vypocitajHodinyJednehoUseku('07:00', '18:00'), 10.5)
})

test('viac usekov jedneho pracovnika ma prestavku iba raz za den', () => {
  const zaznamy = [
    { id: 1, meno: 'Adam', datum: '2026-09-22', zakazka: 'A', prichod: '07:00', odchod: '10:00' },
    { id: 2, meno: 'Adam', datum: '2026-09-22', zakazka: 'B', prichod: '10:00', odchod: '13:00' },
  ]
  assert.equal(sucet(zaznamy), 5.5)
})

test('dva dlhe useky neodpocitaju dve prestavky', () => {
  const zaznamy = [
    { id: 1, meno: 'Adam', datum: '2026-09-22', prichod: '06:00', odchod: '12:00' },
    { id: 2, meno: 'Adam', datum: '2026-09-22', prichod: '12:00', odchod: '18:00' },
  ]
  assert.equal(sucet(zaznamy), 11.5)
})

test('presne 5.5 hodiny nema automaticku prestavku', () => {
  const zaznamy = [{ id: 1, meno: 'Adam', datum: '2026-09-22', prichod: '07:00', odchod: '12:30' }]
  assert.equal(sucet(zaznamy), 5.5)
})

test('prestávka sa pocita osobitne pre kazdeho pracovnika a kazdy den', () => {
  const zaznamy = [
    { id: 1, meno: 'Adam', datum: '2026-09-21', prichod: '07:00', odchod: '13:00' },
    { id: 2, meno: 'Adam', datum: '2026-09-22', prichod: '07:00', odchod: '13:00' },
    { id: 3, meno: 'Boris', datum: '2026-09-22', prichod: '07:00', odchod: '13:00' },
  ]
  assert.equal(sucet(zaznamy), 16.5)
})

test('funguje aj usek cez polnoc', () => {
  const zaznamy = [{ id: 1, meno: 'Adam', datum: '2026-09-22', prichod: '20:00', odchod: '02:00' }]
  assert.equal(sucet(zaznamy), 5.5)
})
