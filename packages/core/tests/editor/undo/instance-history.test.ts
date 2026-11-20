import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'

function withComponent() {
  const editor = createEditor()
  const page = editor.state.currentPageId
  const rect = editor.graph.createNode('RECTANGLE', page, { x: 0, y: 0, width: 100, height: 100 })
  editor.select([rect.id])
  editor.createComponentFromSelection()
  const componentId = editor.graph.getNode(rect.id)?.parentId
  if (!componentId) throw new Error('The component was not created')
  editor.undo.clear()
  return { editor, componentId }
}

function layerIds(editor: ReturnType<typeof createEditor>): string[] {
  return [...editor.graph.nodes.keys()].sort()
}

describe('undo of an inserted instance', () => {
  test('redo brings back the instance layers with the ids they had', () => {
    const { editor, componentId } = withComponent()
    const instanceId = editor.createInstanceFromComponent(componentId)
    expect(instanceId).not.toBeNull()
    const inserted = layerIds(editor)

    editor.undo.undo()
    expect(layerIds(editor)).not.toEqual(inserted)

    editor.undo.redo()
    expect(layerIds(editor)).toEqual(inserted)
  })
})
