import { expect, test } from 'bun:test'

import { writePenDocument } from '@pairdraw/pen'
import { SceneGraph } from '@pairdraw/scene-graph'
import { createCommentThread, writeComments } from '@pairdraw/scene-graph/comments'

/** A page with one button, optionally carrying a comment that was drawn around it. */
function page(annotated: boolean): SceneGraph {
  const graph = new SceneGraph()
  const root = graph.getPages()[0]
  if (!root) throw new Error('Page missing')
  const button = graph.createNode('RECTANGLE', root.id, { name: 'Button' })
  graph.updateNode(button.id, { x: 10, y: 20, width: 40, height: 20 })
  if (annotated) {
    writeComments(graph, [
      createCommentThread(graph, {
        pageId: root.id,
        at: { x: 5, y: 15 },
        region: {
          points: [
            [0, 0],
            [50, 0],
            [50, 30]
          ],
          width: 2,
          bounds: { minX: 0, minY: 0, maxX: 50, maxY: 30 }
        },
        author: { name: 'Ada' },
        text: 'contrast is too low',
        now: '2026-11-25T10:00:00.000Z'
      })
    ])
  }
  return graph
}

/** The file with every layer id replaced, since two graphs number their layers differently. */
function withoutIds(json: string): unknown {
  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(strip)
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => key !== 'id')
          .map(([key, entry]) => [key, strip(entry)])
      )
    }
    return value
  }
  return strip(JSON.parse(json))
}

test('a marked comment adds nothing to a .pen design file', () => {
  expect(withoutIds(writePenDocument(page(true)))).toEqual(
    withoutIds(writePenDocument(page(false)))
  )
})
