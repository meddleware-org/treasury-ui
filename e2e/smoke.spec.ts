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
