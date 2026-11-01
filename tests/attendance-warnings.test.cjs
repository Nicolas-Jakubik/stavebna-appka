const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename
)
const { jeNeobvyklaDochadzka } = require('../lib/attendanceWarnings.ts')
const sample = (datum, prichod, odchod, hodiny=10.5) =>
  jeNeobvyklaDochadzka({datum,prichod,odchod,hodiny})

test('regular weekday and Saturday shifts need no review', () => {
  assert.equal(sample('2026-10-05','07:00','18:00',10.5),false)
  assert.equal(sample('2026-10-05','07:00:00','18:00:00',10.5),false)
  assert.equal(sample('2026-10-03','07:00','17:00',9.5),false)
  assert.equal(sample('2026-10-05','09:00','16:00',6.5),false)
})

test('early, late, Sunday and beyond-midnight shifts are flagged, not rejected', () => {
  assert.equal(sample('2026-10-05','06:45','18:00',10.75),true)
  assert.equal(sample('2026-10-05','07:00','18:15',10.75),true)
  assert.equal(sample('2026-10-03','07:00','17:15',9.75),true)
  assert.equal(sample('2026-10-04','07:00','17:00',9.5),true)
  assert.equal(sample('2026-10-05','22:00','05:00',6.5),true)
})

test('malformed values or extreme hours prompt review', () => {
  assert.equal(sample('2026-02-30','07:00','18:00',10.5),true)
  assert.equal(sample('2026-10-05','oops','18:00',10.5),true)
  assert.equal(sample('2026-10-05','07:00','18:00',0),true)
  assert.equal(sample('2026-10-05','07:00','18:00',15),true)
})

test('dashboard uses the warnings for both summary and row review without changing payroll', () => {
  const src=fs.readFileSync(require('node:path').join(__dirname,'../app/dashboard/page.tsx'),'utf8')
  assert.match(src,/jeNeobvyklaDochadzka/)
  assert.match(src,/filterProblem === 'podozrivy'/)
  assert.match(src,/Čas mimo bežného rozvrhu môže byť oprávnený nadčas/)
})
