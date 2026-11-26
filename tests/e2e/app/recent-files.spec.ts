import { expect, test } from '#tests/e2e/fixtures'
import { waitForAppBoot } from '#tests/helpers/boot'
import { EDITOR_SETUP_TIMEOUT_MS } from '#tests/helpers/timeouts'

// Each test here boots the app itself, and a cold dev server gets thirty seconds for the first
// load (`waitForAppBoot`); a test needs room for that boot plus its own work.
test.beforeEach(() => test.setTimeout(90_000))

test.describe('a populated recent files list', () => {
  test.use({
    storageState: async ({ baseURL }, use) => {
      if (!baseURL) throw new Error('Browser test baseURL is required')
      await use({
        cookies: [],
        origins: [
          {
            origin: new URL(baseURL).origin,
            localStorage: [
              {
                name: 'pairdraw:preferences:v1',
                value: JSON.stringify({ version: 1, onboarding: { aiSetup: 'done' } })
              },
              {
                name: 'pairdraw:recent-documents',
                value: JSON.stringify(
                  Array.from({ length: 12 }, (_, index) => ({
                    id: `local:/design-${index}.fig`,
                    kind: 'local',
                    path: `/design-${index}.fig`,
                    name: `Recent design ${index}`,
                    updatedAt: '2026-01-01T00:00:00.000Z'
                  }))
                )
              }
            ]
          }
        ]
      })
    }
  })

  test('the recent files limit in General settings updates the list and persists', async ({
    page
  }) => {
    await page.goto('/?recent-files')
    await waitForAppBoot(page)
    await page.getByTestId('recent-files-home').waitFor({ timeout: EDITOR_SETUP_TIMEOUT_MS })
    // Each entry also has a menu button, so count the entries rather than buttons named after them.
    const documents = page
      .getByTestId('recent-files-home')
      .locator('[data-slot="document-entry"]')
      .filter({ hasText: /Recent design/ })
    await expect(documents).toHaveCount(10)

    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
    const limit = page.getByRole('combobox', { name: 'Number of recent files' })
    await limit.click()
    await page.getByRole('option', { name: '25', exact: true }).click()
    await page.getByTestId('app-settings-done').click()
    await expect(documents).toHaveCount(12)

    await page.reload()

    await waitForAppBoot(page)
    await expect(documents).toHaveCount(12)
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+,' : 'Control+,')
    await expect(limit).toHaveText('25')
  })
})

test.describe('on a phone', () => {
  // A touch screen: a narrow desktop window keeps mouse-sized controls and focuses the search.
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })

  test('keeps the New tab layout usable', async ({ page }) => {
    await page.goto('/?recent-files')
    await waitForAppBoot(page)

    const search = page.getByLabel('Search files…')
    await expect(search).toBeVisible()
    await expect(search).not.toBeFocused()
    await expect(search).toHaveAttribute('placeholder', 'Search files…')
    await expect(page.getByTestId('home-open-file')).toBeVisible()
    await expect(page.getByTestId('home-new-design')).toBeVisible()
    await expect(page.getByTestId('recent-files-home')).toHaveJSProperty(
      'scrollWidth',
      await page.getByTestId('recent-files-home').evaluate((element) => element.clientWidth)
    )
  })
})

test('a narrow window with a mouse keeps mouse-sized controls and focuses the search', async ({
  page
}) => {
  await page.setViewportSize({ width: 600, height: 800 })
  await page.goto('/?recent-files')
  await waitForAppBoot(page)

  await expect(page.getByLabel('Search files…')).toBeFocused()
  // Medium buttons, 32 px tall; touch screens get the 36 px large ones.
  expect((await page.getByTestId('home-open-file').boundingBox())?.height).toBe(32)
})

test('opens to the recent-files home and starts a new document', async ({ page }) => {
  await page.goto('/?recent-files')
  await waitForAppBoot(page)

  // Home is pinned first and never closes; a design opens in a tab of its own beside it.
  const home = page.getByRole('tab', { name: 'Home' })
  await expect(page.getByTestId('recent-files-home')).toBeVisible()
  await expect(page.getByText('No recent files yet')).toBeVisible()
  await expect(page.getByTestId('tabbar-tab')).toHaveCount(1)
  await expect(home).toBeVisible()
  await expect(page.getByTestId('tabbar-close')).toHaveCount(0)

  await page.getByTestId('home-new-design').click()

  await expect(page.getByTestId('recent-files-home')).toBeHidden()
  const tabs = page.getByTestId('tabbar-tab')
  await expect(tabs).toHaveCount(2)
  await expect(tabs.first()).toHaveAccessibleName('Home')
  await expect(tabs.last()).toContainText('Untitled')
  await expect(page.getByTestId('tabbar-close')).toHaveCount(1)

  await page.getByTestId('tabbar-new').click()

  await expect(page.getByTestId('recent-files-home')).toBeVisible()
  await expect(tabs).toHaveCount(3)
  await expect(tabs.last()).toContainText('New file')
  await expect(page.getByLabel('Search files…')).toBeFocused()
  await expect(page.getByTestId('tabbar-close')).toHaveCount(2)

  const design = page.locator('[data-slot="tab-item"]').filter({ hasText: 'Untitled' })
  await design.getByTestId('tabbar-tab').click()
  await expect(page.getByTestId('recent-files-home')).toBeHidden()
  await design.hover()
  await design.getByTestId('tabbar-close').click()

  await expect(tabs).toHaveCount(2)
  await expect(page.getByTestId('recent-files-home')).toBeVisible()
})
