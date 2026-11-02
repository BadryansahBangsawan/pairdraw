import { expect, test } from 'bun:test'

import { createEditor } from '@open-pencil/core'
import { SceneGraph } from '@open-pencil/scene-graph'

import { removeSelectionAutoLayout } from '@/app/shell/keyboard/auto-layout'

import { expectDefined } from '#tests/helpers/assert'

function setup() {
  const graph = new SceneGraph()
  const pageId = expectDefined(graph.getPages()[0]).id
  const editor = createEditor({ graph })
  const frame = (layoutMode: 'NONE' | 'VERTICAL' | 'HORIZONTAL') =>
    graph.createNode('FRAME', pageId, { width: 200, height: 200, layoutMode }).id
  return { editor, graph, frame, pageId }
}

test('removes auto layout from every selected frame in one undo step', () => {
  const { editor, graph, frame } = setup()
  const vertical = frame('VERTICAL')
  const horizontal = frame('HORIZONTAL')
  const plain = frame('NONE')
  editor.select([vertical, horizontal, plain])

  expect(removeSelectionAutoLayout(editor)).toBe(2)
  expect([vertical, horizontal, plain].map((id) => graph.getNode(id)?.layoutMode)).toEqual([
    'NONE',
    'NONE',
    'NONE'
  ])

  editor.undo.undo()
  expect([vertical, horizontal, plain].map((id) => graph.getNode(id)?.layoutMode)).toEqual([
    'VERTICAL',
    'HORIZONTAL',
    'NONE'
  ])
})

test('does nothing and records nothing when no selected layer has auto layout', () => {
  const { editor, graph, frame, pageId } = setup()
  const plain = frame('NONE')
  const rect = graph.createNode('RECTANGLE', pageId).id
  editor.select([plain, rect])

  expect(removeSelectionAutoLayout(editor)).toBe(0)
  expect(editor.undo.canUndo).toBe(false)
})
