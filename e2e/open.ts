import type { Page } from '@playwright/test'
import { offline } from '@meddleware/frontend-config/look'

/**
 * The built console in its e2e mode, every request that leaves localhost refused. By default the stub chain answers (a balance, three gates,
 * twenty-six events); `down` is the real client with its reads refused, so the page shows its error states in words.
 */
export const open = (tab = 'Overview', options: { down?: boolean } = {}) => async (page: Page) => {
  await offline(page)
  await page.goto(options.down ? '/?chain=down' : '/')
  await page.getByRole('tab', { name: 'Overview' }).waitFor()
  if (tab !== 'Overview') await page.getByRole('tab', { name: tab, exact: true }).click()
  await page.getByRole('heading', { level: 3 }).first().or(page.getByRole('heading', { level: 2 })).first().waitFor()
  if (!options.down) await page.getByText('Loading', { exact: false }).first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => undefined)
}

/** The Activity tab's second page of events. */
export const secondPage = async (page: Page) => {
  await open('Activity')(page)
  await page.getByRole('button', { name: /next/i }).click()
}
