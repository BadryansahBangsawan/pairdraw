import { expect, test } from '@playwright/test'

/**
 * The one place a slow boot fails. Every other spec waits for Home with `EDITOR_SETUP_TIMEOUT_MS`
 * so a cold dev server can finish; that budget would also hide a boot regression, so this test
 * measures the time from navigation to Home's first paint and holds it to a ceiling.
 *
 * Recorded on this machine (dev server, 8 GB machine): 11.5 s cold, 5.5 s warm. Run with
 * `BOOT_BUDGET_COLD=1` on a cold server to accept the larger ceiling; the log always prints the
 * measurement.
 */
const WARM_CEILING_MS = 15_000
const COLD_CEILING_MS = 30_000

test('Home paints within its boot budget', async ({ page }) => {
  const ceiling = process.env.BOOT_BUDGET_COLD === '1' ? COLD_CEILING_MS : WARM_CEILING_MS
  const startedAt = Date.now()
  await page.goto('/?recent-files')
  await expect(page.getByTestId('recent-files-home')).toBeVisible({ timeout: ceiling })
  const elapsed = Date.now() - startedAt
  test.info().annotations.push({
    type: 'boot-budget',
    description: `Home painted in ${elapsed} ms (ceiling ${ceiling} ms)`
  })
  expect(elapsed, `Home painted in ${elapsed} ms, ceiling ${ceiling} ms`).toBeLessThan(ceiling)
})
