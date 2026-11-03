const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')

// Load the actual calculation modules rather than reimplementing them in a test.
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
}
const { vypocitajFondObdobia } = require('../lib/workFund.ts')
const {
  vypocitajNakladyPracovnikov, zhrnNakladyPracovnikovPodlaZakazky,
} = require('../lib/laborCosts.ts')
const { auditujSadzbyVyplat } = require('../lib/payrollRateAudit.ts')
const { hodinovaSadzbaZaznamu } = require('../lib/hourlyRates.ts')

// Invented attendance only: same worker splits one working day between sites,
// Saturday is shorter, a historical rate changes and one snapshot is missing.
const rows = [
  { id:101,meno:'Fiktívny A',datum:'2026-10-14',zakazka:'Stavba Alfa',prichod:'07:00',odchod:'12:00',sadzba_snapshot:10 },
  { id:102,meno:'Fiktívny A',datum:'2026-10-14',zakazka:'Stavba Beta',prichod:'12:00',odchod:'18:00',sadzba_snapshot:10 },
  { id:103,meno:'Fiktívny B',datum:'2026-10-15',zakazka:'Stavba Alfa',prichod:'07:00',odchod:'18:00',sadzba_snapshot:9 },
  { id:104,meno:'Fiktívny A',datum:'2026-10-16',zakazka:'Stavba Alfa',prichod:'07:00',odchod:'18:00',sadzba_snapshot:11 },
  { id:105,meno:'Fiktívny C',datum:'2026-10-17',zakazka:'Stavba Beta',prichod:'07:00',odchod:'17:00',sadzba_snapshot:12 },
  { id:106,meno:'Fiktívny B',datum:'2026-10-20',zakazka:'Stavba Beta',prichod:'07:00',odchod:'13:00',sadzba_snapshot:null },
]
const people = [
  {meno:'Fiktívny A',sadzba:13},
  {meno:'Fiktívny B',sadzba:9},
  {meno:'Fiktívny C',sadzba:12},
]
function sum(items,key){return Math.round(items.reduce((n,r)=>n+r[key],0)*100)/100}
function periods(items) {
  return [
    items.filter(r=>Number(r.datum.slice(8))<=15),
    items.filter(r=>Number(r.datum.slice(8))>=16),
  ]
}

test('October 2026 planned fund is 134.5h + 144h, never actual attendance', () => {
  assert.equal(vypocitajFondObdobia('2026-10',1,15),134.5)
  assert.equal(vypocitajFondObdobia('2026-10',16,31),144)
  assert.equal(vypocitajFondObdobia('2026-10'),278.5)
})

test('multi-site day deducts only one break and preserves site attribution', () => {
  const data = vypocitajNakladyPracovnikov(rows,people)
  assert.equal(data.length,6)
  assert.deepEqual(data.slice(0,2).map(x=>x.hodiny),[5,5.5])
  assert.deepEqual(data.slice(0,2).map(x=>x.suma),[50,55])
  const bySite = zhrnNakladyPracovnikovPodlaZakazky(data)
  assert.equal(bySite.size,2)
  assert.equal(bySite.get('Stavba Alfa').hodiny,26)
  assert.equal(bySite.get('Stavba Alfa').suma,260)
  assert.equal(bySite.get('Stavba Beta').hodiny,20.5)
  assert.equal(bySite.get('Stavba Beta').suma,218.5)
  assert.equal(sum(data,'hodiny'),46.5)
  assert.equal(sum(data,'suma'),478.5)
  // Source order must not alter break attribution or cost totals.
  const reversed = vypocitajNakladyPracovnikov([...rows].reverse(),people)
  const reverseBySite = zhrnNakladyPracovnikovPodlaZakazky(reversed)
  for(const [site,total] of bySite){
    assert.equal(reverseBySite.get(site).suma,total.suma)
    assert.equal(reverseBySite.get(site).hodiny,total.hodiny)
  }
})

test('payroll halves separate entries at midnight on the 15th / 16th', () => {
  const data = vypocitajNakladyPracovnikov(rows,people)
  const [first,second] = periods(data)
  assert.equal(sum(first,'hodiny'),21)
  assert.equal(sum(first,'suma'),199.5)
  assert.equal(sum(second,'hodiny'),25.5)
  assert.equal(sum(second,'suma'),279)
  assert.equal(sum(first,'suma')+sum(second,'suma'),sum(data,'suma'))
})

test('snapshot pay stays historical; fallback is explicit and audit read-only', () => {
  const audit = auditujSadzbyVyplat(rows,people)
  assert.deepEqual(audit,{
    odlisneSadzby:3,
    bezHistorickejSadzby:1,
    bezPorovnatelnehoProfilu:0,
  })
  const salaryByWorker = new Map(people.map(x=>[x.meno,x.sadzba]))
  const costs = vypocitajNakladyPracovnikov(rows,people)
  const formerMethod = sum(costs.map(x=>({
    sum: x.hodiny * (salaryByWorker.get(x.meno) || 0),
  })),'sum')
  assert.equal(formerMethod,531)
  assert.equal(formerMethod - sum(costs,'suma'),52.5)
  assert.equal(hodinovaSadzbaZaznamu(null,9),9)
  assert.equal(hodinovaSadzbaZaznamu(0,9),0,'an explicit zero must not silently use current wage')
  assert.equal(rows[5].sadzba_snapshot,null,'calculation must not rewrite historical records')
})
