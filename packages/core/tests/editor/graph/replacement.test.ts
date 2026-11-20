import { expect, mock, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import type { SkiaRenderer } from '@pairdraw/core/canvas'
import { SceneGraph } from '@pairdraw/scene-graph'

test('graph replacement clears tiled state even when page IDs are reused', () => {
  const editor = createEditor()
  const invalidateStructure = mock()
  // Only the tiled-scene invalidation is exercised; the rest of the renderer stays absent.
  const tiledScene: Partial<SkiaRenderer['tiledScene']> = { invalidateStructure }
  const renderer: Partial<SkiaRenderer> = {
    tiledScene: tiledScene as SkiaRenderer['tiledScene'],
    measureTextNode: undefined
  }
  editor.setCanvasKit({} as Parameters<typeof editor.setCanvasKit>[0], renderer as SkiaRenderer)
  const replacement = new SceneGraph()

  editor.replaceGraph(replacement)

  expect(invalidateStructure).toHaveBeenCalledTimes(1)
  expect(editor.graph).toBe(replacement)
})

test('graph replacement drops the old history, so undo never edits the next document', () => {
  const editor = createEditor()
  const page = editor.graph.getPages()[0]
  const layer = editor.graph.createNode('RECTANGLE', page.id, {
    id: 'shared:1',
    name: 'Old name',
    width: 10,
    height: 10
  })
  editor.updateNodeWithUndo(layer.id, { name: 'Renamed' }, 'Rename')

  // A document opened in the same editor numbers its layers independently, so it can share an id.
  const replacement = new SceneGraph()
  replacement.createNode('RECTANGLE', replacement.getPages()[0].id, {
    id: 'shared:1',
    name: 'Next document layer'
  })
  editor.replaceGraph(replacement)

  expect(editor.undo.canUndo).toBe(false)
  expect(editor.undo.canRedo).toBe(false)
  editor.undo.undo()
  expect(editor.undo.redo()).toBeNull()
  expect(editor.graph.getNode('shared:1')?.name).toBe('Next document layer')
})
