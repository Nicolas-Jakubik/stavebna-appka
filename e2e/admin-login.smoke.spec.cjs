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
