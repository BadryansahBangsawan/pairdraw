import { expect, type Page } from '@playwright/test'

import { EDITOR_BOOT_WAIT_MS, EDITOR_SETUP_TIMEOUT_MS } from './timeouts'

/**
 * The boot splash covers the page until the app draws its first content. A cold dev server
 * transforms the app's module graph on the first request, so the first load of a run can take
 * far longer than the default assertion timeout. Wait for the splash to hide, which is the
 * signal that the app has drawn its first content, with the allowance `CanvasHelper.waitForInit`
 * gives the canvas.
 */
export async function waitForAppBoot(page: Page) {
  await page.locator('#boot-splash').waitFor({ state: 'hidden', timeout: EDITOR_BOOT_WAIT_MS })
}

/**
 * Home's first paint, which can trail the boot splash by seconds on a cold dev server: the
 * recent-files list arrives after the first content, so a plain assertion's default five seconds
 * is not a budget for it. Waits with the setup allowance, like every other first paint.
 */
export async function waitForHome(page: Page, timeout = EDITOR_SETUP_TIMEOUT_MS): Promise<void> {
  await expect(page.getByTestId('recent-files-home')).toBeVisible({ timeout })
}
