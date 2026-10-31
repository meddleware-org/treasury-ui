// Smoke test of the BUILT app: it mounts, shows its landmarks and raises no uncaught error. Requests that leave localhost are refused,
// so the failed reads are expected and are not errors of the page itself.
import { expect, test } from '@playwright/test'
import { offline } from '@meddleware/frontend-config/look'

test('mounts without an uncaught error', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await offline(page)
  await page.goto('/')
  await expect(page.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('main')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Meddleware Treasury')
  expect(errors).toEqual([])
})
