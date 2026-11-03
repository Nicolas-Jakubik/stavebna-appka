// Browser integration tests of a temporary localhost Next.js server only.
// No Vercel production deployment, Supabase project or employee record is used.
const { test, expect } = require('@playwright/test')

const syntheticPassword = 'ONLY-FAKE-LOCAL-E2E-PASSWORD-2026'

test('admin is authenticated; ordinary public recorder is limited to safe fields', async ({ page, request }) => {
  const admin = await request.get('/api/admin/database/zamestnanci')
  expect(admin.status()).toBe(401)
  expect(admin.headers()['cache-control']).toContain('no-store')

  // The recorder is intentionally available without account activation.
  // Salary fields remain denied even when the caller is anonymous.
  const invalidRecorderRead = await request.get('/api/recorder/database/zamestnanci?select=sadzba')
  expect(invalidRecorderRead.status()).toBe(400)
  expect(invalidRecorderRead.headers()['cache-control']).toContain('no-store')

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/admin-prihlasenie/)
  expect(new URL(page.url()).searchParams.get('next')).toBe('/dashboard')
  await expect(page.getByRole('heading', { name: 'Administrácia' })).toBeVisible()
})

test('foreign-origin POST cannot mint an admin session', async ({ request }) => {
  const res = await request.post('/api/admin/login', {
    headers: { origin: 'https://untrusted.example', 'content-type': 'application/json' },
    data: { password: syntheticPassword },
  })
  expect(res.status()).toBe(403)
  expect(res.headers()['set-cookie']).toBeUndefined()
})

test('wrong password stays on login; local synthetic login can open admin', async ({ page, context }) => {
  await page.goto('/admin-prihlasenie?next=%2Fdashboard')
  await expect(page.getByRole('heading', { name: 'Administrácia' })).toBeVisible()

  const password = page.getByPlaceholder('Heslo')
  await password.fill('wrong-local-browser-test-password')
  await page.getByRole('button', { name: 'Vstúpiť' }).click()
  await expect(page.getByText('Nesprávne heslo.')).toBeVisible()
  expect(new URL(page.url()).pathname).toBe('/admin-prihlasenie')
  expect((await context.cookies()).some(c => c.name === 'stavby_admin_session')).toBe(false)

  await password.fill(syntheticPassword)
  await page.getByRole('button', { name: 'Vstúpiť' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
  const cookies = await context.cookies()
  const session = cookies.find(c => c.name === 'stavby_admin_session')
  expect(session).toBeTruthy()
  expect(session.httpOnly).toBe(true)
  expect(session.sameSite).toBe('Lax')
})

test('login screen fits mobile width without a horizontal scrollbar', async ({ page }) => {
  await page.goto('/admin-prihlasenie')
  await expect(page.getByRole('button', { name: 'Vstúpiť' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true)
})

test('original ordinary URL still opens recorder with no link, cookie or password', async ({ page, context, request }) => {
  const base = 'https://localhost:3443'
  await page.goto('/')
  await expect(page).toHaveURL(base + '/')
  await expect(page.getByRole('button', { name: 'Skontrolovať záznam' })).toBeVisible()

  // Reloading the exact same URL must not ask for device activation.
  await page.reload()
  await expect(page.getByRole('button', { name: 'Skontrolovať záznam' })).toBeVisible()
  expect((await context.cookies()).some(c =>
    c.name === 'stavby_recorder_session' || c.name === 'stavby_admin_session'
  )).toBe(false)

  // No production DB secrets exist in this isolated CI browser.
  // The API remains public but gives a controlled 503, not sensitive data.
  const publicRoster = await request.get('/api/recorder/database/zamestnanci?select=meno,aktivny')
  expect(publicRoster.status()).toBe(503)
  const admin = await request.get('/api/admin/database/zamestnanci')
  expect(admin.status()).toBe(401)

  const forbidden = await request.post('/api/recorder/database/zamestnanci', {
    headers: { origin: base },
    data: [{ meno: 'Synthetic only', aktivny: true }],
  })
  expect(forbidden.status()).toBe(403)
  const salaries = await request.get('/api/recorder/database/zamestnanci?select=meno,sadzba')
  expect(salaries.status()).toBe(400)
})


test('failed admin logout never disguises an active session', async ({ page, context }) => {
  await page.goto('/admin-prihlasenie?next=%2Fdashboard')
  await page.getByPlaceholder('Heslo').fill(syntheticPassword)
  await page.getByRole('button', { name: 'Vstúpiť' }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)

  // Mobile navigation must be explicitly opened before tapping logout.
  const menu = page.getByRole('button', { name: 'Otvoriť administráciu' })
  if (await menu.isVisible()) await menu.click()
  const logout = page.getByRole('button', { name: 'Odhlásiť sa' })
  await expect(logout).toBeVisible()
  await page.route('**/api/admin/logout', route => route.fulfill({
    status: 503, contentType: 'application/json', body: '{"error":"test-only outage"}',
  }))

  await logout.click()
  // The desktop sidebar and mobile top bar render separate responsive alerts.
  // Check the visible accessibility alert, never a stale CSS class name.
  await expect(page.getByRole('alert').filter({hasText:'Odhlásenie sa nepodarilo'})).toBeVisible()
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
  expect((await context.cookies()).some(c => c.name === 'stavby_admin_session')).toBe(true)

  await page.unroute('**/api/admin/logout')
  await logout.click()
  await expect(page).toHaveURL(/\/admin-prihlasenie(?:\?.*)?$/)
  expect((await context.cookies()).some(c => c.name === 'stavby_admin_session')).toBe(false)
})
