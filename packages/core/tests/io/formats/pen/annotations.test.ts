import { describe, expect, test } from 'bun:test'

import { layoutAuthoredNodes } from '@pairdraw/core/layout'
import { parsePenFile, type PenNode } from '@pairdraw/pen'

function parseLaidOut(children: PenNode[]) {
  // As Core's .pen reader lays out what it reads.
  return parsePenFile(JSON.stringify({ version: '2.21', children }), {
    layout: (graph) =>
      layoutAuthoredNodes(
        graph,
        graph.getPages().map((page) => page.id)
      )
  })
}

function box(graph: ReturnType<typeof parseLaidOut>, id: string) {
  const node = graph.getNode(id)
  if (!node) throw new Error(`No node ${id}`)
  return { x: node.x, y: node.y, width: node.width, height: node.height }
}

describe('parsePenFile — notes in a laid-out document', () => {
  test('a note and a prompt take the room in an auto layout their cards do', () => {
    const graph = parseLaidOut([
      {
        id: 'column',
        type: 'frame',
        layout: 'vertical',
        children: [
          { id: 'note', type: 'note', width: 150, height: 100, content: 'A note' },
          { id: 'prompt', type: 'prompt', width: 150, height: 100, content: 'Prompt' },
          { id: 'after', type: 'rectangle', width: 100, height: 100, fill: '#AA00AA' }
        ]
      }
    ])

    expect(box(graph, 'note')).toEqual({ x: 0, y: 0, width: 150, height: 100 })
    expect(box(graph, 'prompt')).toEqual({ x: 0, y: 100, width: 150, height: 100 })
    expect(box(graph, 'after')).toEqual({ x: 0, y: 200, width: 100, height: 100 })
    expect(box(graph, 'column')).toMatchObject({ width: 150, height: 300 })
  })

  test('a note with no height grows to its text from the sticky’s own height', () => {
    const graph = parseLaidOut([{ id: 'note', type: 'note', width: 240, content: 'Free' }])
    expect(box(graph, 'note')).toMatchObject({ width: 240, height: 240 })
  })
})
