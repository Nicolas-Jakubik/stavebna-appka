// Read-only browser regression of wages and print/PDF on invented October 2026 data.
// It NEVER connects to a real Supabase project and does not send database writes.
const { test, expect } = require('@playwright/test')

const syntheticPassword = 'ONLY-FAKE-LOCAL-E2E-PASSWORD-2026'
const fakePeople = [
  { id:1, meno:'Fiktívny A', sadzba:13 },
  { id:2, meno:'Fiktívny B', sadzba:9 },
  { id:3, meno:'Fiktívny C', sadzba:12 },
]
const fakeWork = [
  {id:101,meno:'Fiktívny A',datum:'2026-10-14',zakazka:'Stavba Alfa',prichod:'07:00',odchod:'12:00',objekt_id:null,sadzba_snapshot:10},
  {id:102,meno:'Fiktívny A',datum:'2026-10-14',zakazka:'Stavba Beta',prichod:'12:00',odchod:'18:00',objekt_id:null,sadzba_snapshot:10},
  {id:103,meno:'Fiktívny B',datum:'2026-10-15',zakazka:'Stavba Alfa',prichod:'07:00',odchod:'18:00',objekt_id:null,sadzba_snapshot:9},
  {id:104,meno:'Fiktívny A',datum:'2026-10-16',zakazka:'Stavba Alfa',prichod:'07:00',odchod:'18:00',objekt_id:null,sadzba_snapshot:11},
  {id:105,meno:'Fiktívny C',datum:'2026-10-17',zakazka:'Stavba Beta',prichod:'07:00',odchod:'17:00',objekt_id:null,sadzba_snapshot:12},
  {id:106,meno:'Fiktívny B',datum:'2026-10-20',zakazka:'Stavba Beta',prichod:'07:00',odchod:'13:00',objekt_id:null,sadzba_snapshot:null},
]

test('two October payroll PDF periods reconcile with independently calculated synthetic totals', async ({ page }) => {
  const writes = []
  // All calls to the admin database gateway are intercepted; no service role
  // key or real DB connection exists on the isolated localhost server.
  await page.route('**/api/admin/database/**', async route => {
    const req = route.request()
    if(req.method()!=='GET'){
      writes.push(req.method()+' '+req.url())
      return route.fulfill({status:403,contentType:'application/json',body:'{"message":"read-only synthetic E2E"}'})
    }
    const url = new URL(req.url())
    const table = url.pathname.split('/').at(-1)
    let records = table==='dochadzka' ? fakeWork : table==='zamestnanci' ? fakePeople : []
    if(table==='dochadzka'){
      const limits = url.searchParams.getAll('datum')
      const from = limits.find(q=>q.startsWith('gte.'))?.slice(4)
      const until = limits.find(q=>q.startsWith('lte.'))?.slice(4)
      if(from)records=records.filter(x=>x.datum>=from)
      if(until)records=records.filter(x=>x.datum<=until)
    }
    return route.fulfill({
      status:200,contentType:'application/json',
      headers:{'content-range':'0-'+Math.max(0,records.length-1)+'/'+records.length},
      body:JSON.stringify(records),
    })
  })
  await page.goto('/admin-prihlasenie?next=%2Fmzdy')
  await page.getByPlaceholder('Heslo').fill(syntheticPassword)
  await page.getByRole('button',{name:'Vstúpiť'}).click()
  await expect(page).toHaveURL(/\/mzdy(?:\?.*)?$/)
  await page.locator('.vyplaty-toolbar select').selectOption('2026-10')

  // Independent expected results: 14 Oct one 11h shift split over two jobs
  // -> single 30 minute break, 10.5h paid to A. 15 Oct B: 10.5h.
  // First half: 10.5*10 + 10.5*9 = 199.50 EUR, 21 hours.
  await page.getByRole('button',{name:'1.–15.',exact:true}).click()
  await expect(page.locator('.sd-payroll-detail-card')).toContainText('199.50 €')
  await page.emulateMedia({media:'print'})
  const printed = page.locator('.pdf-vyplata')
  await expect(printed).toBeVisible()
  await expect(printed).toContainText('SD Evidencia · výplaty')
  await expect(printed).toContainText('Výplata 1 · 1.–15.')
  await expect(printed.locator('tbody tr').last().locator('td').nth(1)).toHaveText('21.00 h')
  await expect(printed.locator('tbody tr').last().locator('td').nth(2)).toHaveText('199.50 €')
  await expect(printed.locator('tbody')).toContainText('105.00 €')
  await expect(printed.locator('tbody')).toContainText('94.50 €')
  await expect(printed.locator('tbody')).not.toContainText('114.00 €')
  if(test.info().project.name==='desktop-chromium'){
    const bytes=await page.pdf({format:'A4',printBackground:true})
    expect(bytes.subarray(0,4).toString()).toBe('%PDF')
    expect(bytes.length).toBeGreaterThan(5000)
  }
  await page.emulateMedia({media:'screen'})

  // Second half: A 10.5h*11=115.50; C Saturday 9.5h*12=114.00;
  // B 6 gross -> 5.5 net *9=49.50. Total 25.5h and 279.00 EUR.
  await page.getByRole('button',{name:'16.–koniec',exact:true}).click()
  await expect(page.locator('.sd-payroll-detail-card')).toContainText('279.00 €')
  await page.emulateMedia({media:'print'})
  await expect(printed).toBeVisible()
  await expect(printed).toContainText('Výplata 2 · 16.–koniec')
  await expect(printed.locator('tbody tr').last().locator('td').nth(1)).toHaveText('25.50 h')
  await expect(printed.locator('tbody tr').last().locator('td').nth(2)).toHaveText('279.00 €')
  await expect(printed.locator('tbody')).toContainText('115.50 €')
  await expect(printed.locator('tbody')).toContainText('114.00 €')
  await expect(printed.locator('tbody')).toContainText('49.50 €')
  await expect(printed.locator('tbody')).not.toContainText('105.00 €')
  if(test.info().project.name==='desktop-chromium'){
    const bytes=await page.pdf({format:'A4',printBackground:true})
    expect(bytes.subarray(0,4).toString()).toBe('%PDF')
    expect(bytes.length).toBeGreaterThan(5000)
  }
  await page.emulateMedia({media:'screen'})
  expect(writes).toEqual([])
})
