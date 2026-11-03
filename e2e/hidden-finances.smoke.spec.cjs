// Read-only UI regression using a localhost-only synthetic admin session.
// Never connects to a real company database or modifies payroll records.
const { test, expect } = require('@playwright/test')

const fakePassword = 'ONLY-FAKE-LOCAL-E2E-PASSWORD-2026'

test('finance module stays hidden from admin navigation and legacy URL redirects', async ({ page }) => {
  await page.goto('/admin-prihlasenie?next=%2Fdashboard')
  await page.getByPlaceholder('Heslo').fill(fakePassword)
  await page.getByRole('button', { name: 'Vstúpiť' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)

  // Both desktop and mobile use AdminSidebar's shared navigation list.
  // Checking DOM also catches links that are merely hidden with CSS.
  for (const route of ['/dashboard', '/zakazky', '/zamestnanci', '/mzdy']) {
    expect(await page.locator(`a[href="${route}"]`).count()).toBeGreaterThan(0)
  }
  await expect(page.locator('a[href="/financie"]')).toHaveCount(0)

  // The old bookmark must not open the historic finance editing screen.
  await page.goto('/financie')
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
  await expect(page.locator('a[href="/financie"]')).toHaveCount(0)
})
