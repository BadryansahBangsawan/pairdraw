import type { Page } from '@playwright/test'

import type { ImageScaleMode } from '@pairdraw/scene-graph'

/** Where the scene sits: 200% zoom with the layer's top-left 150 px into the canvas. */
const ZOOM = 2
const ORIGIN = 150

/** Builds an image layer, enters and leaves image edit mode, and reads the layer back. */
export function imageCropDriver(page: () => Page) {
  return {
    /**
     * A selected 200 × 100 rectangle at the origin filled with a 400 × 300 image of four
     * coloured quarters, so a crop or reframe changes which colours show.
     */
    async show(mode: ImageScaleMode = 'FILL') {
      return page().evaluate(
        async ({ mode, zoom, origin }) => {
          const store = window.pairdraw?.getStore?.()
          if (!store) throw new Error('Pairdraw store not initialized')
          const canvas = document.createElement('canvas')
          canvas.width = 400
          canvas.height = 300
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Image fixture canvas unavailable')
          for (const [index, color] of ['#ef4444', '#3b82f6', '#14b8a6', '#facc15'].entries()) {
            context.fillStyle = color
            context.fillRect((index % 2) * 200, Math.floor(index / 2) * 150, 200, 150)
          }
          const blob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('No PNG'))))
          })
          const hash = store.storeImage(new Uint8Array(await blob.arrayBuffer()))
          const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
            name: 'Photo',
            x: 0,
            y: 0,
            width: 200,
            height: 100,
            fills: [
              {
                type: 'IMAGE',
                imageHash: hash,
                imageScaleMode: mode,
                color: { r: 0, g: 0, b: 0, a: 1 },
                visible: true,
                opacity: 1
              }
            ]
          })
          store.select([node.id])
          store.undo.clear()
          store.state.zoom = zoom
          store.state.panX = origin
          store.state.panY = origin
          store.requestRender()
          return node.id
        },
        { mode, zoom: ZOOM, origin: ORIGIN }
      )
    },

    /** Canvas coordinates of a point in the layer's own pixels as the scene starts. */
    point(x: number, y: number) {
      return { x: ORIGIN + x * ZOOM, y: ORIGIN + y * ZOOM }
    },

    /** The layer's place and size, and how its image is framed. */
    layer(nodeId: string) {
      return page().evaluate((id) => {
        const node = window.pairdraw?.getStore?.().graph.getNode(id)
        const fill = node?.fills[0]
        if (!node || !fill) return null
        return {
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
          mode: fill.imageScaleMode ?? 'FILL',
          transform: fill.imageTransform ?? null
        }
      }, nodeId)
    },

    /** The layer whose image is being edited, if any. */
    editing() {
      return page().evaluate(() => window.pairdraw?.getStore?.().state.imageEdit?.nodeId ?? null)
    },

    canUndo() {
      return page().evaluate(() => window.pairdraw?.getStore?.().undo.canUndo ?? false)
    },

    /** Enters image edit mode on a layer as the context menu does. */
    edit(nodeId: string) {
      return page().evaluate((id) => {
        const store = window.pairdraw?.getStore?.()
        if (!store) throw new Error('Pairdraw store not initialized')
        store.startImageEdit(id)
        store.requestRender()
      }, nodeId)
    }
  }
}
