import { expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'

import { renderJSX } from '@pairdraw/core/design-jsx'
import { SceneGraph } from '@pairdraw/scene-graph'

test('a grid child with colSpan alone spans its columns and auto-places', async () => {
  const graph = new SceneGraph()
  const [root] = await renderJSX(
    graph,
    `<Frame grid columns="repeat(12, 1fr)" gap={24} w={1200}>
      <Frame name="A" colSpan={7} w="fill" h={40} />
      <Frame name="B" colSpan={5} w="fill" h={40} />
    </Frame>`
  )

  const column = (1200 - 11 * 24) / 12
  const [a, b] = getNodeOrThrow(graph, root.id).childIds.map((id) => getNodeOrThrow(graph, id))
  // `colSpan` alone is CSS `grid-column: span 7`: the span holds and the start is auto.
  expect(a.width).toBeCloseTo(7 * column + 6 * 24, 3)
  expect(a.x).toBe(0)
  expect(b.width).toBeCloseTo(5 * column + 4 * 24, 3)
  expect(b.x).toBeCloseTo(7 * column + 7 * 24, 3)
})

test('a repeat() grid places its cells in equal columns, not collapsed ones', async () => {
  const graph = new SceneGraph()
  const cells = Array.from({ length: 14 }, (_, i) => `<Frame name="C${i}" w={20} h={36} />`)
  const [root] = await renderJSX(
    graph,
    `<Frame grid columns="repeat(7, 1fr)" gap={4} w={280}>${cells.join('')}</Frame>`
  )

  const column = (280 - 6 * 4) / 7
  const children = getNodeOrThrow(graph, root.id).childIds.map((id) => getNodeOrThrow(graph, id))
  for (const [index, cell] of children.entries()) {
    expect(cell.x).toBeCloseTo((index % 7) * (column + 4), 3)
    expect(cell.y).toBe(Math.floor(index / 7) * 40)
    expect(cell.height).toBe(36)
  }
})
