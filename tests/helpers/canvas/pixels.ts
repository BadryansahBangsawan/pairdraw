import type { Page } from '@playwright/test'
import { fromUint8Array } from 'js-base64'

import type { Vector } from '@pairdraw/scene-graph/primitives'

/** Read freshly painted scene pixels in sRGB, before WebGL discards its drawing buffer. */
export async function readScenePixels(page: Page, points: readonly Vector[]): Promise<number[][]> {
  return page.evaluate((points) => {
    const store = window.pairdraw?.getStore?.()
    const renderer = store?.canvasRenderers.find((candidate) => candidate.tracksSceneSettlement)
    const source = document.querySelector<HTMLCanvasElement>(
      '[data-test-id="scene-canvas-element"]'
    )
    if (!store || !renderer || !source) throw new Error('Scene canvas unavailable')
    const copy = document.createElement('canvas')
    copy.width = source.width
    copy.height = source.height
    const context = copy.getContext('2d', { colorSpace: 'srgb' })
    if (!context) throw new Error('sRGB canvas unavailable')
    renderer.renderFromEditorState(
      store.state,
      store.graph,
      store.textEditor,
      renderer.viewportWidth,
      renderer.viewportHeight,
      false,
      'scene',
      true
    )
    context.drawImage(source, 0, 0)
    const pixels = points.map((point) =>
      Array.from(
        context.getImageData(
          Math.floor(point.x * devicePixelRatio),
          Math.floor(point.y * devicePixelRatio),
          1,
          1
        ).data
      )
    )
    store.requestRepaint()
    return pixels
  }, points)
}

/** How two screenshots of the same size differ: how many pixels changed, and by how much at most. */
export async function compareScreenshots(
  page: Page,
  first: Uint8Array,
  second: Uint8Array
): Promise<{ pixels: number; maxDelta: number }> {
  return page.evaluate(
    async ([firstData, secondData]) => {
      const decode = async (data: string) => {
        const blob = await (await fetch(`data:image/png;base64,${data}`)).blob()
        const bitmap = await createImageBitmap(blob, {
          colorSpaceConversion: 'none',
          premultiplyAlpha: 'none'
        })
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('2D canvas unavailable')
        context.drawImage(bitmap, 0, 0)
        return context.getImageData(0, 0, bitmap.width, bitmap.height).data
      }
      const [a, b] = await Promise.all([decode(firstData), decode(secondData)])
      if (a.length !== b.length) throw new Error('Screenshots differ in size')
      let pixels = 0
      let maxDelta = 0
      for (let index = 0; index < a.length; index += 4) {
        let delta = 0
        for (let channel = 0; channel < 4; channel++) {
          delta = Math.max(delta, Math.abs(a[index + channel] - b[index + channel]))
        }
        if (delta > 0) pixels++
        maxDelta = Math.max(maxDelta, delta)
      }
      return { pixels, maxDelta }
    },
    [fromUint8Array(first), fromUint8Array(second)]
  )
}
