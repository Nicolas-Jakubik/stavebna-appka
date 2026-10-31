// All payroll records and rates here are synthetic. Network access is limited
// to the temporary localhost HTTPS server from playwright.smoke.config.cjs.
const { test, expect } = require('@playwright/test')

const syntheticPassword = 'ONLY-FAKE-LOCAL-E2E-PASSWORD-2026'
const employees = [{ id: 1, meno: 'Fiktívny pracovník', sadzba: 12 }]
const attendance = [
  {
    id: 1, meno: 'Fiktívny pracovník', datum: '2026-09-10',
    zakazka: 'TEST STAVBA', prichod: '07:00', odchod: '19:00',
    objekt_id: null, sadzba_snapshot: 12,
  },
  {
    id: 2, meno: 'Fiktívny pracovník', datum: '2026-09-20',
    zakazka: 'TEST STAVBA', prichod: '07:00', odchod: '19:00',
    objekt_id: null, sadzba_snapshot: 10,
  },
]

test('historical payroll warning is period-scoped and appears in print output', async ({ page }) => {
  await page.goto('/admin-prihlasenie?next=%2Fmzdy')
  await page.getByPlaceholder('Heslo').fill(syntheticPassword)
  await page.getByRole('button', { name: 'Vstúpiť' }).click()
  await expect(page).toHaveURL(/\/mzdy(?:\?.*)?$/)

  await page.route('**/api/admin/database/**', async route => {
    const request = route.request()
    if (request.method() !== 'GET') {
      await route.fulfill({ status: 403, body: '{"message":"synthetic test denies writes"}' })
      return
    }
    const url = new URL(request.url())
    const table = url.pathname.split('/').at(-1)
    let rows = table === 'dochadzka' ? attendance : table === 'zamestnanci' ? employees : []
    if (table === 'dochadzka') {
      const dates = url.searchParams.getAll('datum')
      const after = dates.find(v => v.startsWith('gte.'))?.slice(4)
      const before = dates.find(v => v.startsWith('lte.'))?.slice(4)
      if (after) rows = rows.filter(x => x.datum >= after)
      if (before) rows = rows.filter(x => x.datum <= before)
    }
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json', 'content-range': '0-' + Math.max(0, rows.length - 1) + '/' + rows.length },
      body: JSON.stringify(rows),
    })
  })

  await page.goto('/mzdy')
  await page.locator('.vyplaty-toolbar select').selectOption('2026-09')
  const banner = page.locator('.skryt-pri-tlaci[role="status"]').filter({ hasText: 'Kontrola historických sadzieb' })

  await page.getByRole('button', { name: '1.–15.', exact: true }).click()
  await expect(page.getByRole('button', { name: 'PDF 1.–15.' })).toBeEnabled()
  await expect(page.locator('.vyplaty-mobile-table').filter({ hasText: 'Na výplatu' }).getByText('138.00 €')).toBeVisible()
  await expect(banner).toHaveCount(0)

  // Verify the first-half PDF has its own totals and no warning from the
  // second half; printing must not leak data from the previous selection.
  await page.emulateMedia({ media: 'print' })
  const firstPrinted = page.locator('.pdf-vyplata')
  await expect(firstPrinted).toBeVisible()
  await expect(firstPrinted).toContainText('138.00 €')
  await expect(firstPrinted).not.toContainText('115.00 €')
  await expect(firstPrinted).not.toContainText('Upozornenie k historickej mzde:')
  await page.emulateMedia({ media: 'screen' })

  await page.getByRole('button', { name: '16.–koniec', exact: true }).click()
  await expect(page.getByRole('button', { name: 'PDF 16.–koniec' })).toBeEnabled()
  await expect(banner).toContainText('Počet záznamov s hodinovou sadzbou odlišnou od dnešného profilu: 1.')
  await expect(page.locator('.vyplaty-mobile-table').filter({ hasText: 'Na výplatu' }).getByText('115.00 €')).toBeVisible()

  await page.emulateMedia({ media: 'print' })
  const printed = page.locator('.pdf-vyplata')
  await expect(printed).toBeVisible()
  await expect(printed).toContainText('Upozornenie k historickej mzde:')
  await expect(printed).toContainText('115.00 €')
  await expect(printed).not.toContainText('138.00 €')
})
