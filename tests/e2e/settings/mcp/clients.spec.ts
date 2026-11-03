import { expect, test } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

test('setting up other apps is offered only by the desktop app', async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await page.getByTestId('app-settings-trigger').click()
  await page.getByTestId('settings-section-mcp').click()

  const panel = page.getByTestId('settings-mcp-panel')
  await expect(panel.getByTestId('settings-mcp-automation-panel')).toBeVisible()
  // A browser cannot reach other apps' config files, so it offers no switches for them.
  await expect(panel.locator('[data-slot="mcp-clients"]')).toHaveCount(0)
  await expect(panel.getByRole('switch', { name: /Claude Desktop/ })).toHaveCount(0)
})
