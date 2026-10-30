// Browser integration tests of a temporary localhost Next.js server only.
// No Vercel production deployment, Supabase project or employee record is used.
const { test, expect } = require('@playwright/test')

const syntheticPassword = 'ONLY-FAKE-LOCAL-E2E-PASSWORD-2026'

test('unauthenticated admin and recorder database access fail closed', async ({ page, request }) => {
  const admin = await request.get('/api/admin/database/zamestnanci')
  expect(admin.status()).toBe(401)
  expect(admin.headers()['cache-control']).toContain('no-store')

  const recorder = await request.get('/api/recorder/database/dochadzka')
  expect(recorder.status()).toBe(401)
  expect(recorder.headers()['cache-control']).toContain('no-store')

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

test('recorder-only private link opens mobile attendance without admin privileges', async ({ page, context, request }) => {
  // All credentials and URLs are local to this HTTPS CI server. No real Supabase access.
  const base = 'https://localhost:3443'
  const login = await request.post('/api/admin/login', {
    headers: { origin: base },
    data: { password: syntheticPassword },
  })
  expect(login.status()).toBe(200)

  // The admin-only endpoint issues a one-month private recorder link.
  const issued = await request.post('/api/admin/recorder-link', { headers: { origin: base } })
  expect(issued.status()).toBe(200)
  const { link, validDays } = await issued.json()
  expect(validDays).toBe(30)
  expect(link.startsWith(base + '/#zapis=recorder-v1.')).toBe(true)

  // Browser's existing device context remains unauthenticated; the API request fixture owns the admin cookie.
    await page.goto(link)
    await expect(page.getByRole('button', { name: 'Skontrolovať záznam' })).toBeVisible()
    await expect(page).toHaveURL(base + '/') // fragment was discarded after exchange

    const cookies = await context.cookies()
    const recorder = cookies.find(cookie => cookie.name === 'stavby_recorder_session')
    expect(recorder).toBeTruthy()
    expect(recorder.httpOnly).toBe(true)
    expect(recorder.sameSite).toBe('Strict')
    expect(cookies.some(cookie => cookie.name === 'stavby_admin_session')).toBe(false)

    const session = await context.request.get('/api/recorder/session')
    expect(session.status()).toBe(200)
    expect((await session.json()).authorized).toBe(true)

    const admin = await context.request.get('/api/admin/database/zamestnanci')
    expect(admin.status()).toBe(401)

    // Recorder must never be allowed to mutate workers instead of attendance.
    const forbidden = await context.request.post('/api/recorder/database/zamestnanci', {
      headers: { origin: base },
      data: [{ meno: 'Synthetic only', aktivny: true }],
    })
    expect(forbidden.status()).toBe(403)
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
  await expect(page.getByRole('alert')).toContainText('Odhlásenie sa nepodarilo')
  await expect(page).toHaveURL(/\/dashboard(?:\?.*)?$/)
  expect((await context.cookies()).some(c => c.name === 'stavby_admin_session')).toBe(true)

  await page.unroute('**/api/admin/logout')
  await logout.click()
  await expect(page).toHaveURL(/\/admin-prihlasenie(?:\?.*)?$/)
  expect((await context.cookies()).some(c => c.name === 'stavby_admin_session')).toBe(false)
})
