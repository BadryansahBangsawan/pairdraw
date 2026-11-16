import { afterEach, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SkiaRenderer } from '@pairdraw/core/canvas'
import { createJSXPreviewRecorder, stageJSXPreview } from '@pairdraw/core/design-jsx'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import { createStreamingJSXParser } from '@pairdraw/design-jsx'
import { SceneGraph } from '@pairdraw/scene-graph'

const originalLoadFonts = SkiaRenderer.prototype.loadFonts

afterEach(() => {
  SkiaRenderer.prototype.loadFonts = originalLoadFonts
})

async function staged(jsx: string) {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const tree = expectDefined(createStreamingJSXParser().append(jsx).tree, 'tree')
  return expectDefined(await stageJSXPreview(graph, tree, {}, pageId), 'staged preview')
}

describe('JSX preview recorder fonts', () => {
  test('loads fonts again for the next record when loading them failed', async () => {
    const ck = await initCanvasKit()
    let loads = 0
    SkiaRenderer.prototype.loadFonts = async function (this: SkiaRenderer, ...args) {
      loads++
      if (loads === 1) throw new Error('fonts offline')
      return originalLoadFonts.apply(this, args)
    }
    const record = createJSXPreviewRecorder(ck)
    try {
      const preview = await staged('<Text size={16}>Hi</Text>')
      const signal = new AbortController().signal
      await expect(record.record(preview, signal)).rejects.toThrow('fonts offline')
      await record.record(preview, signal).then((picture) => picture?.delete())
      expect(loads).toBe(2)
    } finally {
      record.destroy()
    }
  })
})
