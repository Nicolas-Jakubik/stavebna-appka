const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  module._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
}
const { lenAktivniPracovnici } = require('../lib/activeWorkers.ts')

test('active roster excludes explicitly inactive workers while preserving ids', () => {
  const rows = [
    {id:1,meno:'Worker A',aktivny:true},
    {id:2,meno:'Worker B',aktivny:false},
    {id:3,meno:'Worker C',aktivny:null},
    {id:4,meno:'Worker D'},
  ]
  assert.deepEqual(lenAktivniPracovnici(rows).map(r=>r.id),[1,3,4])
  assert.equal(rows.length,4)
})

test('new recorder selector and day-missing checks both filter status', () => {
  const recorder = fs.readFileSync(path.join(__dirname,'../app/page.tsx'),'utf8')
  const dashboard = fs.readFileSync(path.join(__dirname,'../app/dashboard/page.tsx'),'utf8')
  const schema = fs.readFileSync(path.join(__dirname,'../lib/recorderValidation.ts'),'utf8')
  assert.match(recorder,/readAll\('zamestnanci', 'meno,aktivny'\)/)
  assert.match(recorder,/select\('meno,aktivny'\)/)
  assert.match(recorder,/lenAktivniPracovnici\(workers\.data\)/)
  assert.match(dashboard,/select\('id,meno,aktivny'\)/)
  assert.match(dashboard,/lenAktivniPracovnici\(zamestnanciResult\.data\)/)
  assert.match(schema,/zamestnanci: 'meno,aktivny'/)
  assert.doesNotMatch(schema,/zamestnanci: '.*sadzba/)
})
