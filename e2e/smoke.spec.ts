// Smoke test of the BUILT app in its e2e mode: it mounts, shows its landmarks, raises no uncaught error, and shows the stub chain's data
// (and, with `?chain=down`, says that the reads failed). Requests that leave localhost are refused.
import { expect, test } from '@playwright/test'
import { offline } from '@meddleware/frontend-config/look'
import { open } from './open.js'

test('mounts without an uncaught error', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await offline(page)
  await page.goto('/')
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Treasury')
  expect(errors).toEqual([])
})

test('shows the chain it reads: balance, commission, treasury address, gates and events', async ({ page }) => {
  await open('Accounts')(page)
  await expect(page.getByText('0.20%', { exact: true })).toBeVisible()
  await expect(page.getByText('12345.6789 SUI').first()).toBeVisible()
  await expect(page.getByText(`0x${'7e'.repeat(32)}`).first()).toBeVisible()
  await expect(page.getByRole('rowheader', { name: 'Studio pass' })).toBeVisible()
  await expect(page.getByRole('rowheader', { name: /Annual all-access pass for the partner programme/ })).toBeVisible()
  await open('Activity')(page)
  await expect(page.getByRole('row', { name: /Access sold/ }).first()).toBeVisible()
  await expect(page.getByRole('row', { name: /Access used/ }).first()).toBeVisible()
  await expect(page.getByText('Epoch 742')).toBeVisible()
})

test('pages through the events', async ({ page }) => {
  await open('Activity')(page)
  const rows = page.getByRole('row')
  const first = await rows.nth(1).innerText()
  await page.getByRole('button', { name: /next/i }).click()
  await expect(rows.nth(1)).not.toHaveText(first)
})

test('says so when the node cannot be read', async ({ page }) => {
  await open('Accounts', { down: true })(page)
  await expect(page.getByRole('alert').first()).toBeVisible()
})

// The column headings carry help text. It was drawn inside the table, so in an EMPTY table (the node unreachable: no rows to make it wide)
// the text was wider than the table, widened its scroll area and had to be scrolled sideways to read. It is now drawn in the top layer,
// beside its button, wrapped inside its own background. (At a phone width the four headings are wider than the screen, and the table scrolls
// sideways by design; what must hold is that opening the text changes none of that.)
for (const viewport of [{ width: 320, height: 640 }, { width: 1280, height: 800 }]) {
  test(`help text in the empty Activity table does not widen the table or the page (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await open('Activity', { down: true })(page)
    await expect(page.getByText('No events found.')).toBeVisible()
    const tableOverflow = () => page.evaluate(() => { const w = document.querySelector('.mw-data-table-wrap') as HTMLElement; return w.scrollWidth - w.clientWidth })
    const baseline = await tableOverflow()
    const buttons = page.getByRole('button', { name: 'Help' })
    expect(await buttons.count()).toBe(3)
    for (let i = 0; i < 3; i++) {
      await buttons.nth(i).hover()
      const tip = page.locator('small[popover]:popover-open')
      await expect(tip).toBeVisible()
      const m = await page.evaluate(() => {
        const tipEl = document.querySelector('small[popover]:popover-open') as HTMLElement
        const doc = document.documentElement
        const r = tipEl.getBoundingClientRect()
        return {
          page: doc.scrollWidth - doc.clientWidth,
          textFits: tipEl.scrollWidth <= tipEl.clientWidth + 1 && tipEl.scrollHeight <= tipEl.clientHeight + 1,
          left: r.left,
          right: r.right,
        }
      })
      expect(await tableOverflow(), 'the text changed how far the table scrolls sideways').toBe(baseline)
      expect(m.page).toBeLessThanOrEqual(0)
      expect(m.textFits).toBe(true)
      expect(m.left).toBeGreaterThanOrEqual(0)
      expect(m.right).toBeLessThanOrEqual(viewport.width)
      await page.mouse.move(0, 0)
      await expect(tip).toBeHidden()
    }
  })
}
