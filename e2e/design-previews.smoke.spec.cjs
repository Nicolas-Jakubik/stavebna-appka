// Browser smoke of static previews on a disposable localhost CI server.
// Synthetic data only; no Supabase server credentials or production requests.
const { test, expect } = require('@playwright/test')

const screens = [
  ['dochadzka','Evidencia hodín'],
  ['vyplaty','Výplaty'],
  ['stavby','Stavby'],
  ['pracovnici','Pracovníci'],
  ['financie','Financie'],
]

test('all five design screens load without login, data APIs or horizontal overflow', async ({ page }) => {
  const dbRequests = []
  page.on('request', req => {
    if (/\/api\/(admin|recorder)\//.test(new URL(req.url()).pathname)) dbRequests.push(req.url())
  })
  for(const [section,title] of screens) {
    const resp = await page.goto('/design-preview/'+section)
    expect(resp.status()).toBe(200)
    await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible()
    await expect(page.getByText('VIZUÁLNA UKÁŽKA',{exact:false})).toBeVisible()
    await expect(page.locator('.sdp-side-item[aria-current="page"]')).toHaveCount(1)
    const noOverflow = await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth + 2)
    expect(noOverflow,section+' must not scroll horizontally').toBe(true)
  }
  expect(dbRequests).toEqual([])
})

test('synthetic finances show internally consistent arithmetic', async ({ page }) => {
  await page.goto('/design-preview/financie')
  await expect(page.getByText('Aktuálne náklady')).toBeVisible()
  // 17,000 + 12,600 + 14,600 = 44,200 €
  await expect(page.getByText('44 200 €',{exact:false})).toBeVisible()
  await expect(page.getByText('Cashflow firmy')).toBeVisible()
  await expect(page.getByText('500 €',{exact:false})).toBeVisible()
  await expect(page.getByText('Pozor na rozpočet')).toBeVisible()
})
