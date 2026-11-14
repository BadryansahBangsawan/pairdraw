import type { Page } from '@playwright/test'

/**
 * Builds a vertical auto layout with a 6 px inside stroke and padding 10 around a rectangle,
 * selected, and reads back where the rectangle sits and whether strokes are included.
 */
export function strokesInLayoutDriver(page: () => Page) {
  let ids: { frame: string; child: string } | undefined

  return {
    async build() {
      ids = await page().evaluate(() => {
        const store = window.pairdraw?.getStore?.()
        if (!store) throw new Error('Pairdraw store not initialized')
        const frame = store.createShape('FRAME', 100, 100, 200, 150)
        const child = store.createShape('RECTANGLE', 0, 0, 40, 40, frame)
        store.graph.updateNode(frame, {
          layoutMode: 'VERTICAL',
          paddingTop: 10,
          paddingRight: 10,
          paddingBottom: 10,
          paddingLeft: 10,
          strokes: [
            {
              type: 'SOLID',
              color: { r: 0, g: 0, b: 0, a: 1 },
              opacity: 1,
              visible: true,
              weight: 6,
              align: 'INSIDE'
            }
          ]
        })
        store.runLayoutForNode(frame)
        store.select([frame])
        return { frame, child }
      })
    },

    state() {
      if (!ids) throw new Error('Build the scene first')
      return page().evaluate(({ frame, child }) => {
        const graph = window.pairdraw?.getStore?.().graph
        const node = graph?.getNode(child)
        return {
          included: graph?.getNode(frame)?.strokesIncludedInLayout,
          x: node?.x,
          y: node?.y
        }
      }, ids)
    }
  }
}
