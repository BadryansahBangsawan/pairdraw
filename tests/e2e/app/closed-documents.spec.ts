import { expect, test, type Page } from '@playwright/test'

import type * as AppTabs from '@/app/tabs'

import { CanvasHelper } from '#tests/helpers/canvas'
import { testPath } from '#tests/helpers/paths'

const FIXTURE = 'gold-preview.fig'

// A tab that opens scrolls its bar into view smoothly; a click waits for its target to stand
// still, and under load the animation never settles. These tests assert what a close does, not
// how the bar animates, so they run with motion reduced, as the tab bar's own overflow spec does.
test.use({ contextOptions: { reducedMotion: 'reduce' } })

async function openFixtureInNewTab(page: Page) {
  const openedTabId = await page.evaluate(async (fixture) => {
    const tabsURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(tabsURL)
    const response = await fetch(`/__fixtures/${fixture}`)
    const store = await tabs.openFileInNewTab(new File([await response.arrayBuffer()], fixture))
    return tabs.getTabForStore(store)?.id ?? ''
  }, FIXTURE)
  // This test closes tabs to see their documents released, so the document must be fully presented
  // first: a close during the first frame would release what has not mounted yet. The canvas's own
  // waits allow thirty seconds for that frame on a cold or busy server.
  await expect
    .poll(
      () =>
        page.evaluate(async (tabId) => {
          const tabsURL = '/src/app/tabs/index.ts'
          const tabs: typeof AppTabs = await import(tabsURL)
          const tab = tabs.getTabsSnapshot().find((entry) => entry.id === tabId)
          return Boolean(
            tab &&
              tabs.getActiveTabId() === tabId &&
              tab.store.graph.nodes.size > 100 &&
              !tab.store.state.preparation
          )
        }, openedTabId),
      { timeout: 30_000 }
    )
    .toBe(true)
}

function activeTabRenderers(page: Page) {
  return page.evaluate(async () => {
    const tabsURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(tabsURL)
    return tabs.getActiveStore().canvasRenderers.length
  })
}

// A closed tab must release its document. CanvasKit's WebGL context table, an editor's global
// text measurer, store effects created during a component's setup, and app-level event
// subscriptions each kept every closed document alive: store, graph, canvas, and UI tree. A
// closing tab's canvas also registered its renderers with the tab that became active, which
// kept every closed canvas and its whole UI tree alive in the remaining document.
test('documents closed in tabs are released', async ({ page }) => {
  // Four opens, each allowed the canvas's thirty seconds to present, and a garbage-collection
  // check at the end.
  test.setTimeout(180_000)
  await page.route(`**/__fixtures/${FIXTURE}`, (route) =>
    route.fulfill({ path: testPath('fixtures', FIXTURE) })
  )
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
  const cdp = await page.context().newCDPSession(page)
  await page.evaluate(() => Reflect.set(window, '__closedGraphs', []))

  // The first document replaces the empty startup tab and stays open while others close.
  await openFixtureInNewTab(page)
  await expect.poll(() => activeTabRenderers(page)).toBeGreaterThan(0)
  const remainingRenderers = await activeTabRenderers(page)

  for (let cycle = 0; cycle < 3; cycle++) {
    await openFixtureInNewTab(page)
    await page.evaluate(async () => {
      const tabsURL = '/src/app/tabs/index.ts'
      const tabs: typeof AppTabs = await import(tabsURL)
      const store = tabs.getActiveStore()
      const graphs = Reflect.get(window, '__closedGraphs') as WeakRef<object>[]
      graphs.push(new WeakRef(store.graph))
      await tabs.closeTab(tabs.getActiveTabId(), 'discard')
    })
  }

  // A graph still referenced is a leak whether collected in one second or thirty: the bound only
  // limits how long a forced collection may take on a busy server.
  await expect
    .poll(
      async () => {
        await cdp.send('HeapProfiler.collectGarbage')
        return page.evaluate(
          () =>
            (Reflect.get(window, '__closedGraphs') as WeakRef<object>[]).filter((ref) =>
              ref.deref()
            ).length
        )
      },
      { timeout: 30_000 }
    )
    .toBe(0)
  // The remaining tab's canvas remounts when it becomes active again.
  await expect.poll(() => activeTabRenderers(page)).toBe(remainingRenderers)
})
