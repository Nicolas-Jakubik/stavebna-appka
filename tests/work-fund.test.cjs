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

test('pracovny fond pouziva firemny rezim 10.5 / 9.5 / 0', () => {
  assert.equal(HODINY_PRACOVNY_DEN, 10.5)
  assert.equal(HODINY_SOBOTA, 9.5)

  assert.equal(vypocitajFondObdobia('2026-09', 1, 15), 134.5)
  assert.equal(vypocitajFondObdobia('2026-09', 16), 134.5)
  assert.equal(vypocitajFondObdobia('2026-09'), 269)
})

test('nedela sa do fondu nepocita', () => {
  // 6. 9. 2026 je nedeľa.
  assert.equal(vypocitajFondObdobia('2026-09', 6, 6), 0)
})

test('sobota sa pocita 9.5 hodiny', () => {
  // 5. 9. 2026 je sobota.
  assert.equal(vypocitajFondObdobia('2026-09', 5, 5), 9.5)
})
