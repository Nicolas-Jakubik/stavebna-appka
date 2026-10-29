const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const source = fs.readFileSync(path.join(__dirname, '../app/dashboard/page.tsx'), 'utf8')

for (const [label, start, end] of [
  ['yesterday missing-worker check', 'async function nacitajNezapisanychVcera()', 'async function '],
  ['dashboard name/project filters', 'async function nacitajFiltre()', 'async function '],
]) {
  test(label + ' never silently truncates the employee roster', () => {
    const index = source.indexOf(start)
    assert.ok(index >= 0, 'missing screen loader')
    const from = index + start.length
    const next = source.indexOf(end, from)
    const body = source.slice(from, next >= 0 ? next : undefined)
    assert.match(body, /nacitajVsetkyStrany<any>\(async \(start, end\) => \{/)
    assert.match(body, /\.from\('zamestnanci'\)\.select\('id,meno,aktivny'\)/)
    assert.match(body, /\.order\('id', \{ ascending: true \}\)\.range\(start, end\)/)
    assert.match(body, /\.error/)
    assert.match(body, /status|Status|ChybaKontroly|chybaKontroly|setChybaKontroly/)
  })
}
