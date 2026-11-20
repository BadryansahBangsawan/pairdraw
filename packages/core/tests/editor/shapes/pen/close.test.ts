import { afterEach, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@pairdraw/core'

import { getNodeOrThrow } from '#core-tests/helpers/assert'

let editor: Editor

afterEach(() => editor.dispose())

/** A closed path of `points`, pressed back on its first point before committing. */
function penPath(points: ReadonlyArray<readonly [number, number]>): string {
  editor = createEditor()
  for (const [x, y] of points) editor.penAddVertex(x, y)
  editor.penSetPendingClose(true)
  editor.penCommit(true)
  const page = editor.graph.getNode(editor.state.currentPageId)
  const [id] = page?.childIds ?? []
  if (!id) throw new Error('Expected a vector layer')
  return id
}

test('closes a two-point path with a segment back to its first point', () => {
  const id = penPath([
    [0, 0],
    [100, 0]
  ])
  const network = getNodeOrThrow(editor.graph, id).vectorNetwork

  expect(network?.vertices).toHaveLength(2)
  expect(network?.segments).toHaveLength(2)
  expect(network?.segments.at(-1)).toMatchObject({ start: 1, end: 0 })
  expect(network?.regions).toHaveLength(1)
  expect(network?.regions[0]?.loops[0]).toHaveLength(2)
})

test('keeps closing a three-point path with a segment back to its first point', () => {
  const id = penPath([
    [0, 0],
    [100, 0],
    [50, 80]
  ])
  const network = getNodeOrThrow(editor.graph, id).vectorNetwork

  expect(network?.segments).toHaveLength(3)
  expect(network?.segments.at(-1)).toMatchObject({ start: 2, end: 0 })
})
