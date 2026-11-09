import type { Page } from '@playwright/test'

/**
 * The boot splash covers the page until the app draws its first content. A cold dev server
 * transforms the app's module graph on the first request, so the first load of a run can take
 * far longer than the default assertion timeout. Wait for the splash to hide, which is the
 * signal that the app has drawn its first content, with the allowance `CanvasHelper.waitForInit`
 * gives the canvas.
 */
export async function waitForAppBoot(page: Page) {
  await page.locator('#boot-splash').waitFor({ state: 'hidden', timeout: 30_000 })
}
