import type { Page } from '@playwright/test'

/**
 * Waits for the demo's tour to be presented. An open settles when its page is applied, but its
 * first frame also ends the layout a heavy document computes on open, so a test that touches the
 * canvas waits for it too. The canvas allows thirty seconds for that frame.
 */
export async function waitForDemo(page: Page) {
  await page.waitForFunction(
    () => {
      const store = window.pairdraw?.getStore?.()
      return Boolean(
        store?.graph.getNode(store.state.currentPageId)?.name === 'Tour' &&
          store.graph.nodes.size > 0 &&
          !store.state.preparation
      )
    },
    undefined,
    { timeout: 30_000 }
  )
}
