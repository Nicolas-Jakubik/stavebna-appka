// Isolated browser verification; no company database and no production writes.
const { test, expect } = require('@playwright/test')

test('recorder sees daily entries, history, locked admin row and can propose correction in UI', async ({ page }) => {
  const writes = []
  await page.route('**/api/recorder/attendance?date=*', route => {
    const date = new URL(route.request().url()).searchParams.get('date')
    const rows = [
      {
        id: 11, meno: 'Fiktívny pracovník A', datum: date, zakazka: 'Stavba Alfa',
        objekt_id: null, prichod: '07:00:00', odchod: '18:00:00',
        created_at: '2026-11-03T15:00:00Z', edit_revision: 1, edit_locked: false,
        edited_at: '2026-11-03T16:00:00Z', edited_by: 'Vedúci ukážka',
      },
      {
        id: 12, meno: 'Fiktívny pracovník B', datum: date, zakazka: 'Stavba Alfa',
        objekt_id: null, prichod: '07:00:00', odchod: '17:00:00',
        created_at: '2026-11-03T15:00:00Z', edit_revision: 2, edit_locked: true,
        edited_at: '2026-11-03T17:00:00Z', edited_by: 'Administrátor',
      },
    ]
    const history = [{
      id: 40, dochadzka_id: 11, actor_label: 'Vedúci ukážka', actor_kind: 'recorder',
      changed_at: '2026-11-03T16:00:00Z', revision: 1,
      old_values: { prichod: '07:00:00', odchod: '17:00:00', zakazka: 'Stavba Alfa' },
      new_values: { prichod: '07:00:00', odchod: '18:00:00', zakazka: 'Stavba Alfa' },
    }]
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ rows, history, isAdmin: false }) })
  })
  await page.route('**/api/recorder/attendance', async route => {
    if (route.request().method() !== 'POST') return route.fallback()
    writes.push(route.request().postDataJSON())
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ saved: true, result: { id: 11, revision: 2 } }) })
  })
  await page.goto('/')
  await page.getByRole('tab', { name: /Zápisy/ }).click()
  await expect(page.getByText('Fiktívny pracovník A')).toBeVisible()
  await expect(page.getByText('Fiktívny pracovník B')).toBeVisible()
  await expect(page.getByText('Upraviť môže iba administrátor')).toBeVisible()
  await page.getByRole('button', { name: /História/ }).click()
  await expect(page.getByText(/Vedúci ukážka \(neoverené meno\)/)).toBeVisible()
  await page.getByRole('button', { name: '✎ Upraviť' }).click()
  await page.getByRole('textbox', { name: 'Meno zapisovateľa' }).fill('Vedúci ukážka')
  await page.getByLabel('Nový odchod').fill('17:30')
  await page.getByRole('button', { name: 'Uložiť opravu' }).click()
  await expect(page.getByText('Oprava bola uložená. Pôvodný čas zostal v histórii.')).toBeVisible()
  expect(writes).toHaveLength(1)
  expect(writes[0]).toMatchObject({ id: 11, revision: 1, actor: 'Vedúci ukážka', odchod: '17:30' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2)).toBe(true)
})
