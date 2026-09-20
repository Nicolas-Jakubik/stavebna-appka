const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename)
const { NextRequest } = require('next/server')
const tokenLib = require('../lib/recorderSession.ts')
const admin = require('../lib/adminSession.ts')
const validation = require('../lib/recorderValidation.ts')
const route = require('../app/api/recorder/database/[table]/route.ts')
const session = require('../app/api/recorder/session/route.ts')
const link = require('../app/api/admin/recorder-link/route.ts')
const origin = 'https://app.example'
const ctx = table => ({ params: Promise.resolve({ table }) })
const entry = { meno: 'Test', zakazka: 'Stavba', datum: '2026-09-20', prichod: '07:00', odchod: '16:00' }
test('recorder privileges, validation and server routes', async t => {
  process.env.ADMIN_PASSWORD = 'test-only-password'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.example'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-only-server-key'
  const token = tokenLib.createRecorderToken()
  const cookie = `${tokenLib.RECORDER_COOKIE}=${token}`
  const req = (method='GET', query='', body, extra={}) => new NextRequest(`${origin}/api/recorder/database/dochadzka${query}`, { method, headers: { cookie, origin, 'content-type':'application/json', ...extra }, body: body === undefined ? undefined : JSON.stringify(body) })
  const original = global.fetch
  let calls = []
  global.fetch = async (url, init) => { calls.push({ url:String(url), init }); return Response.json([]) }
  try {
    await t.test('signed link expiry, tampering and role separation', async () => {
      assert.equal(tokenLib.verifyRecorderToken(token), true)
      assert.equal(tokenLib.verifyRecorderToken(tokenLib.createRecorderToken(1)), false)
      assert.equal(tokenLib.verifyRecorderToken(token.replace('recorder-v1', 'v1')), false)
      assert.equal(await admin.verifyAdminSession(token), false)
      assert.equal(tokenLib.verifyRecorderToken((await admin.createAdminSession()).value), false)
      process.env.ADMIN_PASSWORD = 'rotated'
      assert.equal(tokenLib.verifyRecorderToken(token), false)
      process.env.ADMIN_PASSWORD = 'test-only-password'
    })
    await t.test('link issuance is admin-only', async () => {
      assert.equal((await link.POST(req('POST'))).status,401)
      const adminCookie = `${admin.ADMIN_COOKIE}=${(await admin.createAdminSession()).value}`
      const response = await link.POST(req('POST','',undefined,{cookie:adminCookie}))
      assert.equal(response.status,200)
      assert.match((await response.json()).link, /\/#zapis=recorder-v1\./)
      assert.equal((await link.POST(req('POST','',undefined,{cookie:adminCookie,origin:'https://evil.example'}))).status,403)
    })
    await t.test('token exchange creates an HttpOnly cookie and enforces origin', async () => {
      assert.equal((await session.POST(req('POST','',{token},{origin:'https://evil.example'}))).status,403)
      assert.equal((await session.POST(req('POST','',{token:'forged'}))).status,401)
      assert.equal((await session.POST(req('POST','',{token:'x'.repeat(2000)}))).status,413)
      const response = await session.POST(req('POST','',{token}))
      assert.equal(response.status,200)
      assert.match(response.headers.get('set-cookie'), /HttpOnly/)
      assert.match(response.headers.get('set-cookie'), /SameSite=strict/i)
      assert.equal((await session.GET(req('GET','',undefined,{cookie:''}))).status,401)
    })
    await t.test('no cookie, unrestricted dates, private fields and tables are blocked before fetch', async () => {
      assert.equal((await route.GET(req('GET','',undefined,{cookie:''}),ctx('zamestnanci'))).status,401)
      for(const table of ['secrets','__proto__','toString','rpc/function']) assert.equal((await route.GET(req(),ctx(table))).status,400)
      for(const query of ['?select=sadzba','?select=*,zamestnanci(*)','?select=meno&or=(true)','?select=meno','?datum=gte.2020-01-01&datum=lte.2026-01-01']) assert.equal((await route.GET(req('GET',query),ctx('dochadzka'))).status,400)
      assert.equal(calls.length,0)
    })
    await t.test('read projection, active jobs and credentials are owned by server', async () => {
      assert.equal((await route.GET(req('GET','?select=meno',undefined,{apikey:'evil','accept-profile':'private'}),ctx('zamestnanci'))).status,200)
      assert.match(calls.at(-1).url,/select=meno&limit=1000/)
      assert.equal(calls.at(-1).init.headers.apikey,'test-only-server-key')
      assert.equal(calls.at(-1).init.headers['Accept-Profile'],'public')
      await route.GET(req('GET','?select=nazov&stav=eq.Archiv'),ctx('zoznam_zakaziek'))
      assert.equal(new URL(calls.at(-1).url).searchParams.get('stav'),'eq.Aktívna')
      await route.GET(req('GET','?select=meno,datum&datum=gte.2026-09-14&datum=lte.2026-09-19'),ctx('dochadzka'))
      assert.equal(new URL(calls.at(-1).url).searchParams.getAll('datum').length,2)
    })
    await t.test('strict entry validation rejects invalid or mixed batches', () => {
      assert.deepEqual(validation.validateRecorderEntries([entry]),[entry])
      for(const value of [[],{},[entry,entry],[{...entry,sadzba:100}],[{...entry,datum:'2026-02-30'}],[{...entry,prichod:'07:01'}],[{...entry,prichod:['07:00']}],[{...entry,odchod:'07:00'}],[entry,{...entry,meno:'Other',zakazka:'Other'}]]) assert.equal(validation.validateRecorderEntries(value),null)
    })
    await t.test('writes only insert attendance through the atomic RPC', async () => {
      assert.equal(route.DELETE,undefined)
      assert.equal(route.PATCH,undefined)
      assert.equal((await route.POST(req('POST','',[entry],{origin:'https://evil.example'}),ctx('dochadzka'))).status,403)
      assert.equal((await route.POST(req('POST','',[entry]),ctx('zamestnanci'))).status,403)
      global.fetch = async (url,init) => { calls.push({url:String(url),init}); return new Response(null,{status:204}) }
      assert.equal((await route.POST(req('POST','',[entry]),ctx('dochadzka'))).status,201)
      assert.match(calls.at(-1).url,/\/rest\/v1\/rpc\/record_attendance_secure$/)
      assert.deepEqual(JSON.parse(calls.at(-1).init.body),{entries:[entry]})
      global.fetch = async () => Response.json({code:'23505',message:'overlap'},{status:409})
      assert.equal((await route.POST(req('POST','',[entry]),ctx('dochadzka'))).status,409)
    })
    await t.test('real SDK preserves recorder reads and insert shape', async () => {
      calls=[]
      global.fetch=async(url,init)=>{calls.push({url:String(url),init});return Response.json([])}
      const {supabase}=require('../lib/recorderClient.ts')
      assert.equal((await supabase.from('dochadzka').select('meno, datum').gte('datum','2026-09-14').lte('datum','2026-09-19')).error,null)
      await supabase.from('dochadzka').insert([entry])
      assert.match(calls[0].url,/^\/api\/recorder\/database\/dochadzka\?/)
      assert.deepEqual(JSON.parse(calls[1].init.body),[entry])
      assert.equal(calls[0].init.headers.get('apikey'),null)
    })
  } finally { global.fetch=original }
})
