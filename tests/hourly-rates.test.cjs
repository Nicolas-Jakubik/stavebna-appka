const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename
)

const { hodinovaSadzbaZaznamu } = require('../lib/hourlyRates.ts')

test('historical hourly rate does not change when employee rate changes', () => {
  assert.equal(hodinovaSadzbaZaznamu(10, 12), 10)
  assert.equal(hodinovaSadzbaZaznamu('10.50', '14'), 10.5)
})

test('historical hourly rate survives employee deletion', () => {
  assert.equal(hodinovaSadzbaZaznamu(12, undefined), 12)
  assert.equal(hodinovaSadzbaZaznamu(11, null), 11)
})

test('fallback for legacy attendance without a recorded rate', () => {
  assert.equal(hodinovaSadzbaZaznamu(null, 10), 10)
  assert.equal(hodinovaSadzbaZaznamu(undefined, '12'), 12)
  assert.equal(hodinovaSadzbaZaznamu(undefined, undefined), 0)
})

test('invalid rates are not treated as valid amounts; zero is explicit', () => {
  assert.equal(hodinovaSadzbaZaznamu('invalid', 9), 9)
  assert.equal(hodinovaSadzbaZaznamu(-1, 9), 9)
  assert.equal(hodinovaSadzbaZaznamu(0, 9), 0)
})
