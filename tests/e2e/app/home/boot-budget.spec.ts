import { expect, test } from '@playwright/test'

import { EDITOR_SETUP_TIMEOUT_MS } from '#tests/helpers/timeouts'

/**
 * The one place a slow boot fails. Every other spec waits for Home with `EDITOR_SETUP_TIMEOUT_MS`
 * so a cold dev server can finish; that budget would also hide a boot regression, so this test
 * measures the time from navigation to Home's first paint and holds it to a ceiling.
 *
 * The wait itself is generous on purpose: if a boot regresses, the test must fail with the real
 * measurement, not with a bare assertion timeout. The ceilings are this machine's 5.5 s warm /
 * 11.5 s cold, with headroom for a loaded runner: CI and `BOOT_BUDGET_COLD=1` both take the cold
 * ceiling.
 *
 * Imports `@playwright/test` directly (not `#tests/e2e/fixtures`) on purpose: this spec opens no
 * canvas and needs none of the fixtures' error collection.
 */
const WARM_CEILING_MS = 15_000
const COLD_CEILING_MS = 30_000

test('Home paints within its boot budget', async ({ page }) => {
  const cold = process.env.BOOT_BUDGET_COLD === '1' || Boolean(process.env.CI)
  const ceiling = cold ? COLD_CEILING_MS : WARM_CEILING_MS
  const startedAt = Date.now()
  await page.goto('/?recent-files')
  await expect(page.getByTestId('recent-files-home')).toBeVisible({
    timeout: EDITOR_SETUP_TIMEOUT_MS
  })
  const elapsed = Date.now() - startedAt
  test.info().annotations.push({
    type: 'boot-budget',
    description: `Home painted in ${elapsed} ms (ceiling ${ceiling} ms)`
  })
  expect(elapsed, `Home painted in ${elapsed} ms, ceiling ${ceiling} ms`).toBeLessThan(ceiling)
})
