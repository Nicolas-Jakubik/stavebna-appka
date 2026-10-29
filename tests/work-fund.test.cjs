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
  HODINY_PRACOVNY_DEN,
  HODINY_SOBOTA,
  vypocitajFondObdobia,
} = require('../lib/workFund.ts')

test('pracovny fond pouziva firemny rezim 11.5 / 10.5 / 0', () => {
  assert.equal(HODINY_PRACOVNY_DEN, 11.5)
  assert.equal(HODINY_SOBOTA, 10.5)

  assert.equal(vypocitajFondObdobia('2026-09', 1, 15), 147.5)
  assert.equal(vypocitajFondObdobia('2026-09', 16), 147.5)
  assert.equal(vypocitajFondObdobia('2026-09'), 295)
})

test('nedela sa do fondu nepocita', () => {
  // 6. 9. 2026 je nedeľa.
  assert.equal(vypocitajFondObdobia('2026-09', 6, 6), 0)
})

test('sobota sa pocita 10.5 hodiny', () => {
  // 5. 9. 2026 je sobota.
  assert.equal(vypocitajFondObdobia('2026-09', 5, 5), 10.5)
})

test('fond na prelome rokov zachováva 11.5/10.5 h a nedelu bez fondu', () => {
  assert.equal(vypocitajFondObdobia('2027-01', 2, 2), 10.5) // sobota
  assert.equal(vypocitajFondObdobia('2027-01', 3, 3), 0) // nedeľa
  assert.equal(vypocitajFondObdobia('2027-01', 4, 4), 11.5) // pondelok
})

test('fond používa rovnaké čisté hodiny ako typická celodenná dochádzka', () => {
  const { vypocitajHodinyJednehoUseku } = require('../lib/workHours.ts')
  assert.equal(vypocitajHodinyJednehoUseku('07:00','19:00'), HODINY_PRACOVNY_DEN)
  assert.equal(vypocitajHodinyJednehoUseku('07:00','18:00'), HODINY_SOBOTA)
})
