const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename)
}

const { bezpecnaCestaPoPrihlaseni } = require('../lib/adminSafeRedirect.ts')
const login = require('../app/api/admin/login/route.ts')
const logout = require('../app/api/admin/logout/route.ts')
const origin = 'https://sd.example'
const request = (url, data, extra = {}) => new Request(url, {
  method:'POST', headers:{origin,'content-type':'application/json',...extra}, body:data,
})

test('admin next redirect only accepts relative same-origin routes', () => {
  assert.equal(bezpecnaCestaPoPrihlaseni('/dashboard','https://sd.example'),'/dashboard')
  assert.equal(bezpecnaCestaPoPrihlaseni('/mzdy?mesiac=2026-10#cast2','https://sd.example'),'/mzdy?mesiac=2026-10#cast2')
  for (const evil of [null,'','//attacker.example/','/\\attacker.example','https://attacker.example',
    'javascript:alert(1)','\\\\attacker.example','/%5c%5cattacker.example','/dashboard\nhttps://attacker.example']) {
    const actual = bezpecnaCestaPoPrihlaseni(evil,origin)
    assert.ok(actual.startsWith('/') && !actual.startsWith('//'))
    assert.equal(new URL(actual,origin).origin,origin)
    if (evil !== '/%5c%5cattacker.example') assert.equal(actual,'/dashboard',String(evil))
  }
  const page = fs.readFileSync(path.join(__dirname,'../app/admin-prihlasenie/page.tsx'),'utf8')
  assert.match(page,/bezpecnaCestaPoPrihlaseni\(next, window\.location\.origin\)/)
})

test('admin login refuses cross-origin, originless and wrong-format bodies before issuing cookies', async () => {
  const old = process.env.ADMIN_PASSWORD
  process.env.ADMIN_PASSWORD = 'only-for-this-test-not-a-real-password'
  try {
    for (const headers of [{origin:'https://evil.example'},{origin:''},{'sec-fetch-site':'cross-site'}]) {
      const res=await login.POST(request(origin+'/api/admin/login',JSON.stringify({password:process.env.ADMIN_PASSWORD}),headers))
      assert.equal(res.status,403)
      assert.equal(res.headers.get('set-cookie'),null)
    }
    assert.equal((await login.POST(request(origin+'/api/admin/login','{}',{'content-type':'text/plain'}))).status,415)
    assert.equal((await login.POST(request(origin+'/api/admin/login','x'.repeat(2200)))).status,413)
    assert.equal((await login.POST(request(origin+'/api/admin/login','not-json'))).status,400)
    const ok=await login.POST(request(origin+'/api/admin/login',JSON.stringify({password:process.env.ADMIN_PASSWORD})))
    assert.equal(ok.status,200)
    assert.match(ok.headers.get('set-cookie'),/HttpOnly/i)
    assert.match(ok.headers.get('set-cookie'),/SameSite=lax/i)
    assert.equal((await ok.json()).ok,true)
  } finally {
    if (old===undefined) delete process.env.ADMIN_PASSWORD
    else process.env.ADMIN_PASSWORD=old
  }
})

test('logout refuses cross-origin form submits and only deletes the cookie on same origin', async () => {
  assert.equal((await logout.POST(request(origin+'/api/admin/logout','',{'origin':'https://evil.example'}))).status,403)
  assert.equal((await logout.POST(request(origin+'/api/admin/logout','',{'origin':''}))).status,403)
  const res=await logout.POST(request(origin+'/api/admin/logout',''))
  assert.equal(res.status,200)
  assert.match(res.headers.get('set-cookie'),/Max-Age=0/i)
})
