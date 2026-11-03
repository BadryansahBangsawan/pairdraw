import type { Page } from '@playwright/test'

/** The Slides specs' driver: builds a deck on the current page and reads the editor's slides. */
export function slidesDriver(page: Page) {
  return {
    /** Replaces the page's layers with frames named `names`, left to right, in layer order. */
    async createDeck(names: string[]): Promise<string[]> {
      return page.evaluate((frameNames) => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('OpenPencil store not initialized')
        const pageId = store.state.currentPageId
        // Deleting changes the page's child list, so delete from a copy of it.
        const existing = store.graph.getNode(pageId)?.childIds.slice() ?? []
        for (const id of existing) store.graph.deleteNode(id)
        const ids = frameNames.map(
          (name, index) =>
            store.graph.createNode('FRAME', pageId, {
              name,
              x: index * 1100,
              y: 0,
              width: 960,
              height: 540
            }).id
        )
        store.clearSelection()
        store.requestRender()
        return ids
      }, names)
    },

    /** The page's slides by name, in slide order. */
    async slideNames(): Promise<string[]> {
      return page.evaluate(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('OpenPencil store not initialized')
        return store.getSlides().map((slide) => slide.name)
      })
    },

    /** The slide being presented, by name, or null when nothing is presented. */
    async presentedSlide(): Promise<string | null> {
      return page.evaluate(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('OpenPencil store not initialized')
        const shown = store.getPresentation()
        return shown ? (store.graph.getNode(shown.slideId)?.name ?? null) : null
      })
    },

    /** The canvas's pan and zoom. */
    async viewport() {
      return page.evaluate(() => {
        const store = window.openPencil?.getStore?.()
        if (!store) throw new Error('OpenPencil store not initialized')
        const { panX, panY, zoom } = store.state
        return { panX, panY, zoom }
      })
    }
  }
}
