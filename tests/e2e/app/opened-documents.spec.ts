import { expect, test, type Page } from '@playwright/test'

import type * as AppTabs from '@/app/tabs'

import { CanvasHelper } from '#tests/helpers/canvas'
import { testPath } from '#tests/helpers/paths'
import { openLayersPanel } from '#tests/helpers/properties'

// A tab that opens scrolls its bar into view smoothly; a click waits for its target to stand
// still, and under load the animation never settles. These tests assert what a close does, not
// how the bar animates, so they run with motion reduced, as the tab bar's own overflow spec does.
test.use({ contextOptions: { reducedMotion: 'reduce' } })

async function openFixture(page: Page, fixture: string) {
  await page.route(`**/__fixtures/${fixture}`, (route) =>
    route.fulfill({ path: testPath('fixtures', fixture) })
  )
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  await openLayersPanel(page)
  await page.evaluate(async (name) => {
    const tabsURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(tabsURL)
    const response = await fetch(`/__fixtures/${name}`)
    await tabs.openFileInNewTab(new File([await response.arrayBuffer()], name))
  }, fixture)
  const tab = page
    .locator('[data-slot="tab-item"]')
    .filter({ hasText: fixture.replace(/\.fig$/, '') })
  await expect(tab).toBeVisible()
  await expectOpenedDocument(page, fixture.replace(/\.fig$/, ''))
  return tab
}

/**
 * A document is ready to touch once its page is applied **and** presented: the first frame also
 * ends the layout a heavy file recomputes on open, and a click during that layout hangs on a busy
 * main thread. Presentation is the canvas's work, so it gets the canvas's thirty seconds.
 */
async function expectOpenedDocument(page: Page, name: string) {
  await expect
    .poll(
      () =>
        page.evaluate((expected) => {
          const store = window.pairdraw?.getStore?.()
          return Boolean(
            store &&
              store.state.documentName === expected &&
              store.graph.nodes.size > 0 &&
              !store.state.preparation
          )
        }, name),
      { timeout: 30_000 }
    )
    .toBe(true)
}

// Opening a page lays it out, which updates node sizes and positions but is not an edit.
test('an opened .fig file stays saved until it is edited', async ({ page }) => {
  // A page's first layout is the file's work, not the open's; the app is busy until it commits.
  test.setTimeout(90_000)
  // An auto-layout file whose layout the app recomputes on its first page.
  const tab = await openFixture(page, 'gold-preview.fig')
  await expect(tab.getByRole('img', { name: 'Unsaved changes' })).toHaveCount(0)

  await tab.getByTestId('tabbar-close').click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(tab).toHaveCount(0)
})

// A page's layers load from the opened file the first time it is shown.
test('showing another page of an opened .fig file keeps it saved', async ({ page }) => {
  test.setTimeout(90_000)
  const tab = await openFixture(page, 'slots.fig')
  await page.getByTestId('pages-item').filter({ hasText: 'Slots fixture' }).click()
  // The switch settles when its page is applied and presented, as an open does.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const store = window.pairdraw?.getStore?.()
          return store
            ? `${store.graph.getNode(store.state.currentPageId)?.name ?? ''}:${store.state.preparation ? 'busy' : 'ready'}`
            : ''
        }),
      { timeout: 30_000 }
    )
    .toBe('Slots fixture:ready')
  await expect
    .poll(() =>
      page.evaluate(() => {
        const store = window.pairdraw?.getStore?.()
        return store ? store.graph.getChildren(store.state.currentPageId).length : 0
      })
    )
    .toBeGreaterThan(0)
  await expect(tab.getByRole('img', { name: 'Unsaved changes' })).toHaveCount(0)

  await tab.getByTestId('tabbar-close').click()
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expect(tab).toHaveCount(0)
})
