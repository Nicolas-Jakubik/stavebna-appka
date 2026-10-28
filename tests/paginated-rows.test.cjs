const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText, filename)

const { nacitajVsetkyStrany } = require('../lib/paginatedRows.ts')

test('fetches over 1,000 rows without dropping rows at the first page boundary', async () => {
  const source = Array.from({ length: 1184 }, (_, i) => ({ id: i + 1 }))
  const ranges = []
  const result = await nacitajVsetkyStrany(async (start, end) => {
    ranges.push([start, end])
    return { data: source.slice(start, end + 1), error: null }
  })
  assert.equal(result.error, null)
  assert.equal(result.data.length, 1184)
  assert.deepEqual(ranges, [[0,499],[500,999],[1000,1499]])
  assert.equal(new Set(result.data.map(row => row.id)).size,1184)
})

test('an exact page boundary is followed by an empty terminal page', async () => {
  const source = Array.from({ length: 1000 }, (_, i) => i)
  const result = await nacitajVsetkyStrany(async (start, end) => ({
    data: source.slice(start,end+1), error: null,
  }))
  assert.equal(result.data.length,1000)
})

test('upstream errors never return a misleading partial dataset', async () => {
  const result = await nacitajVsetkyStrany(async (start) => start === 0
    ? { data: Array.from({ length: 500 }, (_, i) => i), error: null }
    : { data: null, error: { message: 'database is unavailable' } })
  assert.equal(result.data,null)
  assert.equal(result.error.message,'database is unavailable')
})

test('invalid responses and hit page limit fail closed', async () => {
  const invalid = await nacitajVsetkyStrany(async () => ({ data: null, error: null }))
  assert.equal(invalid.data,null)
  const excessive = await nacitajVsetkyStrany(async () => ({ data: [1,2], error: null }),2,3)
  assert.equal(excessive.data,null)
  assert.match(excessive.error.message,/limit/)
})
