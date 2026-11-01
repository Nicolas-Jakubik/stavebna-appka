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

test('potvrdeny fond: Po-Pia 07:00-18:00 (10.5 h net), So 07:00-17:00 (9.5 h net)', () => {
  assert.equal(HODINY_PRACOVNY_DEN, 10.5)
  assert.equal(HODINY_SOBOTA, 9.5)

  assert.equal(vypocitajFondObdobia('2026-09', 1, 15), 134.5)
  assert.equal(vypocitajFondObdobia('2026-09', 16), 134.5)
  assert.equal(vypocitajFondObdobia('2026-09'), 269)

  // October 2026: 11 weekdays + 2 Saturdays in first half,
  // 11 weekdays + 3 Saturdays in the second half.
  assert.equal(vypocitajFondObdobia('2026-10', 1, 15), 134.5)
  assert.equal(vypocitajFondObdobia('2026-10', 16), 144)
  assert.equal(vypocitajFondObdobia('2026-10'), 278.5)
})

test('nedela sa do fondu nepocita', () => {
  // 6. 9. 2026 je nedela.
  assert.equal(vypocitajFondObdobia('2026-09', 6, 6), 0)
})

test('sobota sa pocita 9.5 hodiny', () => {
  // 5. 9. 2026 je sobota.
  assert.equal(vypocitajFondObdobia('2026-09', 5, 5), 9.5)
})

test('fond na prelome rokov zachovava 10.5/9.5 h a nedelu bez fondu', () => {
  assert.equal(vypocitajFondObdobia('2027-01', 2, 2), 9.5) // sobota
  assert.equal(vypocitajFondObdobia('2027-01', 3, 3), 0) // nedela
  assert.equal(vypocitajFondObdobia('2027-01', 4, 4), 10.5) // pondelok
})

test('fond pouziva rovnake ciste hodiny ako typicka celodenna dochadzka', () => {
  const { vypocitajHodinyJednehoUseku } = require('../lib/workHours.ts')
  assert.equal(vypocitajHodinyJednehoUseku('07:00', '18:00'), HODINY_PRACOVNY_DEN)
  assert.equal(vypocitajHodinyJednehoUseku('07:00', '17:00'), HODINY_SOBOTA)
})
