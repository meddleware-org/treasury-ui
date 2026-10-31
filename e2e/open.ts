import type { Page } from '@playwright/test'
import { offline } from '@meddleware/frontend-config/look'

/** The built console with every request that leaves localhost refused: the reads fail, and the page shows that in words. */
export const open = (tab = 'Overview') => async (page: Page) => {
  await offline(page)
  await page.goto('/')
  await page.getByRole('tab', { name: 'Overview' }).waitFor()
  if (tab !== 'Overview') await page.getByRole('tab', { name: tab, exact: true }).click()
  await page.getByRole('heading', { level: 3 }).first().or(page.getByRole('heading', { level: 2 })).first().waitFor()
}
