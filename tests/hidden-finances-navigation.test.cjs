const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

function source(relative) {
  return fs.readFileSync(path.resolve(__dirname, '..', relative), 'utf8')
}

test('main desktop and mobile navigation only lists attendance, projects, workers and payroll', () => {
  const sidebar = source('components/AdminSidebar.tsx')
  for (const route of ['/dashboard', '/zakazky', '/zamestnanci', '/mzdy']) {
    assert.ok(sidebar.includes(`href: '${route}'`), `expected navigation link ${route}`)
  }
  assert.doesNotMatch(sidebar, /href:\s*['"]\/financie['"]/)
  assert.doesNotMatch(sidebar, /key:\s*['"]financie['"]/)
})

test('project detail defaults to overview and does not mount the finance editor', () => {
  const detail = source('app/zakazky/[id]/page.tsx')
  assert.match(detail, /useState<Tab>\('prehlad'\)/)
  assert.doesNotMatch(detail, /ProjectFinanceDashboard/)
  assert.doesNotMatch(detail, /key:\s*['"]financie['"]/)
  assert.match(detail, /href="\/dashboard"/)
})

test('direct finance page is disabled, without removing history or payroll functionality', () => {
  const page = source('app/financie/page.tsx')
  assert.match(page, /redirect\(['"]\/dashboard['"]\)/)
  assert.ok(fs.existsSync(path.resolve(__dirname, '..', 'components/ProjectFinanceDashboard.tsx')))
  assert.ok(fs.existsSync(path.resolve(__dirname, '..', 'lib/laborCosts.ts')))
  assert.ok(fs.existsSync(path.resolve(__dirname, '..', 'app/mzdy/page.tsx')))
})
