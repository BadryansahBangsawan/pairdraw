import type { Page } from '@playwright/test'

/**
 * Builds a main component holding a rectangle with one instance beside it, selects the component,
 * and reads back the types of both.
 */
export function componentToFrameDriver(page: () => Page) {
  let ids: { component: string; instance: string } | undefined

  return {
    async build() {
      ids = await page().evaluate(() => {
        const store = window.pairdraw?.getStore?.()
        if (!store) throw new Error('Pairdraw store not initialized')
        const frame = store.createShape('FRAME', 100, 100, 200, 150)
        store.createShape('RECTANGLE', 20, 20, 40, 40, frame)
        store.select([frame])
        store.createComponentFromSelection()
        const instance = store.createInstanceFromComponent(frame, 400, 100)
        if (!instance) throw new Error('Expected an instance')
        store.select([frame])
        return { component: frame, instance }
      })
    },

    types() {
      if (!ids) throw new Error('Build the scene first')
      return page().evaluate(({ component, instance }) => {
        const graph = window.pairdraw?.getStore?.().graph
        return {
          component: graph?.getNode(component)?.type,
          instance: graph?.getNode(instance)?.type
        }
      }, ids)
    }
  }
}
