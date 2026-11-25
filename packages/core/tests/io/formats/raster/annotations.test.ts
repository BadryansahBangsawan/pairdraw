import { expect, setDefaultTimeout, test } from 'bun:test'

import { initCanvasKit, renderRegionToImage } from '@pairdraw/core/io/formats/raster'
import { SceneGraph } from '@pairdraw/scene-graph'
import { createCommentThread, writeComments } from '@pairdraw/scene-graph/comments'

setDefaultTimeout(60_000)

/** A page with one button, optionally carrying a comment that was drawn around it. */
function page(annotated: boolean): { graph: SceneGraph; pageId: string } {
  const graph = new SceneGraph()
  const root = graph.getPages()[0]
  if (!root) throw new Error('Page missing')
  const button = graph.createNode('RECTANGLE', root.id, { name: 'Button' })
  graph.updateNode(button.id, { x: 20, y: 20, width: 60, height: 40 })
  if (annotated) {
    writeComments(graph, [
      createCommentThread(graph, {
        pageId: root.id,
        at: { x: 10, y: 10 },
        region: {
          points: [
            [0, 0],
            [80, 0],
            [80, 60]
          ],
          width: 2,
          bounds: { minX: 0, minY: 0, maxX: 80, maxY: 60 }
        },
        author: { name: 'Ada' },
        text: 'contrast is too low',
        now: '2026-11-25T10:00:00.000Z'
      })
    ])
  }
  return { graph, pageId: root.id }
}

test('a marked comment does not change what a region renders', async () => {
  const ck = await initCanvasKit()
  const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  const plain = page(false)
  const marked = page(true)
  const without = await renderRegionToImage(ck, plain.graph, plain.pageId, bounds, 1)
  const withComment = await renderRegionToImage(ck, marked.graph, marked.pageId, bounds, 1)
  expect(withComment).not.toBeNull()
  expect([...(withComment ?? [])]).toEqual([...(without ?? [])])
})
