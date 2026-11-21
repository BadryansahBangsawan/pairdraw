import { describe, expect, spyOn, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

/** A frame on the page holding `width` rectangles, one of them holding `width` more. */
function wideTree(width: number) {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const frame = graph.createNode('FRAME', pageId, { name: 'Frame' })
  const first = graph.createNode('FRAME', frame.id, { name: 'Group' })
  for (let index = 0; index < width; index++) {
    graph.createNode('RECTANGLE', first.id, { name: `Inner ${index}` })
  }
  for (let index = 1; index < width; index++) {
    graph.createNode('RECTANGLE', frame.id, { name: `Outer ${index}` })
  }
  return { graph, pageId, frame, first }
}

describe('deleting a subtree', () => {
  test('filters only the parent of the deleted layer, not each deleted parent once per child', () => {
    const { graph, frame } = wideTree(1000)
    const filter = spyOn(Array.prototype, 'filter')
    try {
      graph.deleteNode(frame.id)
      // One filter takes the frame out of the page; the 2000 layers under it cost none.
      expect(filter.mock.calls.length).toBeLessThan(10)
    } finally {
      filter.mockRestore()
    }
    expect(graph.getNode(frame.id)).toBeUndefined()
  })

  test('reports every deleted layer once, children before their parent, with its parent', () => {
    const { graph, pageId, frame, first } = wideTree(3)
    const expected: Array<[string, string]> = [
      ...first.childIds.map((id): [string, string] => [id, first.id]),
      [first.id, frame.id],
      ...frame.childIds.slice(1).map((id): [string, string] => [id, frame.id]),
      [frame.id, pageId]
    ]
    const deleted: Array<[string, string | null]> = []
    const stillListed: string[] = []
    graph.onNodeEvents({
      deleted: (id, parentId) => {
        deleted.push([id, parentId])
        if (parentId && graph.getNode(parentId)?.childIds.includes(id)) stillListed.push(id)
      }
    })

    graph.deleteNode(frame.id)

    expect(deleted).toEqual(expected)
    // A parent going too no longer lists a child once that child is reported deleted.
    expect(stillListed).toEqual([])
    expect(graph.getNode(pageId)?.childIds).toEqual([])
    for (const [id] of expected) expect(graph.getNode(id)).toBeUndefined()
  })
})
