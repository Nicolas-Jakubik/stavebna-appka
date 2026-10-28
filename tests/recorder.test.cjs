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
    await t.test('anonymous and forged recorder sessions cannot read or write', async () => {
      const before = calls.length
      for(const table of ['zamestnanci','zoznam_zakaziek','dochadzka','objekty_stavby','nepritomnosti']) {
        assert.equal((await route.GET(req('GET','',undefined,{cookie:''}),ctx(table))).status,401)
      }
      assert.equal((await route.GET(req('GET','?select=meno',undefined,{cookie:`${tokenLib.RECORDER_COOKIE}=forged`}),ctx('zamestnanci'))).status,401)
      assert.equal((await route.POST(req('POST','',[entry],{cookie:''}),ctx('dochadzka'))).status,401)
      assert.equal((await route.POST(req('POST','',[entry],{cookie:`${tokenLib.RECORDER_COOKIE}=forged`}),ctx('dochadzka'))).status,401)
      assert.equal(calls.length,before)
    })
    await t.test('authorized recorder is still restricted to safe fields, dates and tables', async () => {
      assert.equal((await route.GET(req('GET','?select=meno'),ctx('zamestnanci'))).status,200)
      const before = calls.length
      for(const table of ['secrets','__proto__','toString','rpc/function']) assert.equal((await route.GET(req('GET',''),ctx(table))).status,400)
      for(const query of ['?select=sadzba','?select=*,zamestnanci(*)','?select=meno&or=(true)','?select=meno','?datum=gte.2020-01-01&datum=lte.2026-01-01']) assert.equal((await route.GET(req('GET',query),ctx('dochadzka'))).status,400)
      assert.equal(calls.length,before)
    })
    await t.test('valid admin session may use the recorder API', async () => {
      const adminCookie = `${admin.ADMIN_COOKIE}=${(await admin.createAdminSession()).value}`
      assert.equal((await route.GET(req('GET','?select=meno',undefined,{cookie:adminCookie}),ctx('zamestnanci'))).status,200)
    })
    await t.test('read projection, active jobs and credentials are owned by server', async () => {
      assert.equal((await route.GET(req('GET','?select=meno',undefined,{apikey:'evil','accept-profile':'private'}),ctx('zamestnanci'))).status,200)
      assert.equal(new URL(calls.at(-1).url).searchParams.get('limit'),'500')
      assert.equal(new URL(calls.at(-1).url).searchParams.get('order'),'id.asc')
      assert.equal(calls.at(-1).init.headers.apikey,'test-only-server-key')
      assert.equal(calls.at(-1).init.headers['Accept-Profile'],'public')
      await route.GET(req('GET','?select=nazov&stav=eq.Archiv'),ctx('zoznam_zakaziek'))
      assert.equal(new URL(calls.at(-1).url).searchParams.get('stav'),'eq.Aktívna')
      assert.equal((await route.GET(req('GET','?select=id,zakazka_id,nazov,poradie,aktivny'),ctx('objekty_stavby'))).status,200)
      assert.equal(new URL(calls.at(-1).url).searchParams.get('order'),'id.asc')
      await route.GET(req('GET','?select=meno,datum&datum=gte.2026-09-14&datum=lte.2026-09-19'),ctx('dochadzka'))
      assert.equal(new URL(calls.at(-1).url).searchParams.getAll('datum').length,2)
    })
    await t.test('safe pagination accepts 1,500 total rows but only fetches a bounded page', async () => {
      const oldFetch = global.fetch
      global.fetch = async (url, init) => {
        calls.push({url:String(url), init})
        return Response.json([], {headers: {'content-range':'0-499/1500'}})
      }
      try {
        const response = await route.GET(req('GET','?select=meno,datum&datum=gte.2026-09-14&datum=lte.2026-09-19&limit=500&offset=500'),ctx('dochadzka'))
        assert.equal(response.status,200)
        const params = new URL(calls.at(-1).url).searchParams
        assert.equal(params.get('limit'),'500')
        assert.equal(params.get('offset'),'500')
        assert.equal(params.get('order'),'id.asc')
        assert.deepEqual(await response.json(),[])
      } finally { global.fetch = oldFetch }
    })
    await t.test('unbounded or malformed page requests cannot reach the database', async () => {
      const before = calls.length
      const invalid = [
        '?select=meno&limit=1001&offset=0',
        '?select=meno&limit=501&offset=0',
        '?select=meno&limit=0&offset=0',
        '?select=meno&limit=-1&offset=0',
        '?select=meno&limit=5&offset=-1',
        '?select=meno&limit=5&offset=100000',
        '?select=meno&limit=5&offset=1.2',
        '?select=meno&limit=5',
        '?select=meno&offset=0',
        '?select=meno&limit=500&offset=0&limit=500',
        '?select=meno&limit=500&offset=0&or=(id.gt.1)',
      ]
      for (const query of invalid) assert.equal(
        (await route.GET(req('GET',query),ctx('zamestnanci'))).status,400,query)
      assert.equal(calls.length,before)
    })
    await t.test('strict entry validation rejects invalid or mixed batches', () => {
      assert.deepEqual(validation.validateRecorderEntries([entry]),[entry])
      const withObject = {...entry,objekt_id:3}
      assert.deepEqual(validation.validateRecorderEntries([withObject]),[withObject])
      assert.deepEqual(validation.validateRecorderEntries([{...entry,objekt_id:null}]),[{...entry,objekt_id:null}])
      for(const value of [[],{},[entry,entry],[{...entry,sadzba:100}],[{...entry,objekt_id:'3'}],[{...entry,objekt_id:-1}],[{...entry,datum:'2026-02-30'}],[{...entry,prichod:'07:01'}],[{...entry,prichod:['07:00']}],[{...entry,odchod:'07:00'}],[entry,{...entry,meno:'Other',zakazka:'Other'}]]) assert.equal(validation.validateRecorderEntries(value),null)
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
    await t.test('SDK -> protected recorder API -> database returns all 1203 rows across three bounded pages', async () => {
      const { nacitajVsetkyStrany } = require('../lib/paginatedRows.ts')
      const { supabase } = require('../lib/recorderClient.ts')
      const source = Array.from({ length: 1203 }, (_, i) => ({
        meno: 'Worker-' + String(i+1).padStart(4, '0'),
        datum: '2026-09-20',
        zakazka: 'Test Project',
        prichod: '07:00',
        odchod: '16:00',
        objekt_id: null,
      }))
      const pageRequests = []
      const oldFetch = global.fetch
      global.fetch = async (input, init) => {
        const target = String(input)
        if (target.startsWith('/api/recorder/database/dochadzka?')) {
          const u = new URL(target, origin)
          return route.GET(new NextRequest(u.href, {
            headers: {cookie, origin, 'content-type':'application/json'}
          }), ctx('dochadzka'))
        }
        const u = new URL(target)
        assert.equal(u.origin, 'https://database.example')
        assert.equal(u.pathname, '/rest/v1/dochadzka')
        assert.equal(u.searchParams.get('order'), 'id.asc')
        assert.equal(u.searchParams.get('limit'), '500')
        assert.equal(u.searchParams.getAll('datum').length, 2)
        const offset = Number(u.searchParams.get('offset'))
        const limit = Number(u.searchParams.get('limit'))
        pageRequests.push(offset)
        return Response.json(source.slice(offset, offset + limit), {
          headers: {'content-range':offset+'-'+(offset+limit-1)+'/'+source.length},
        })
      }
      try {
        const result = await nacitajVsetkyStrany(async (start,end) => {
          const { data,error } = await supabase.from('dochadzka')
            .select('meno,datum')
            .gte('datum','2026-09-14').lte('datum','2026-09-20')
            .order('id', {ascending: true}).range(start,end)
          return {data,error}
        })
        assert.equal(result.error,null)
        assert.equal(result.data.length,1203)
        assert.equal(new Set(result.data.map(row => row.meno)).size,1203)
        assert.deepEqual(pageRequests,[0,500,1000])
      } finally {
        global.fetch=oldFetch
      }
    })
    await t.test('recorder API failure on later page never yields partial results', async () => {
      const { nacitajVsetkyStrany } = require('../lib/paginatedRows.ts')
      const { supabase } = require('../lib/recorderClient.ts')
      const oldFetch = global.fetch
      let serverCalls = 0
      global.fetch = async (input, init) => {
        const target = String(input)
        if (target.startsWith('/api/recorder/database/dochadzka?')) {
          const u = new URL(target,origin)
          return route.GET(new NextRequest(u.href,{headers:{cookie,origin}}),ctx('dochadzka'))
        }
        const u = new URL(target)
        const offset=Number(u.searchParams.get('offset'))
        serverCalls++
        if (offset !== 0) return Response.json({message:'database temporarily down'},{status:503})
        return Response.json(Array.from({length:500},(_,i)=>({
          meno:'Test-'+i,datum:'2026-09-20',zakazka:'Test Project',
          prichod:'07:00',odchod:'16:00',objekt_id:null,
        })))
      }
      try {
        const result = await nacitajVsetkyStrany(async (start,end) => {
          const {data,error}=await supabase.from('dochadzka')
            .select('meno,datum').eq('datum','2026-09-20')
            .order('id',{ascending:true}).range(start,end)
          return {data,error}
        })
        assert.equal(result.data,null)
        assert.ok(result.error)
        assert.equal(serverCalls,2)
      } finally {
        global.fetch=oldFetch
      }
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
