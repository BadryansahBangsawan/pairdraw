import { afterEach, describe, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@pairdraw/core'
import { SkiaRenderer } from '@pairdraw/core/canvas'
import { initCanvasKit } from '@pairdraw/core/io/formats/raster'
import type { Fill, SceneGraph } from '@pairdraw/scene-graph'

// Layers share one frozen value for every empty list and record, so a code path that writes into
// one instead of replacing it throws a TypeError. These run the editor's common operations on
// layers that still hold those shared values, then check that undo and redo bring back exactly
// the layers each side had.

const RED: Fill = { type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }
const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
})

async function editorWithRenderer(): Promise<Editor> {
  const ck = await initCanvasKit()
  const surface = ck.MakeSurface(200, 200)
  if (!surface) throw new Error('Could not create CanvasKit surface')
  const renderer = new SkiaRenderer(ck, surface)
  const editor = createEditor()
  editor.setCanvasKit(ck, renderer)
  cleanups.push(() => {
    editor.dispose()
    renderer.destroy()
  })
  return editor
}

/** One default layer of each kind the toolbar creates, all on the current page. */
function defaultLayers(editor: Editor): string[] {
  const shapes = ['RECTANGLE', 'ELLIPSE', 'LINE', 'STAR', 'POLYGON', 'FRAME', 'SECTION'] as const
  const ids = shapes.map((type, index) => editor.createShape(type, index * 120, 0, 100, 100))
  const pageId = editor.state.currentPageId
  ids.push(editor.graph.createNode('TEXT', pageId, { text: 'Label', x: 0, y: 200 }).id)
  return ids
}

/** What each layer holds of the values layers share while empty, and where it sits. */
function layerSummary(graph: SceneGraph) {
  return [...graph.getAllNodes()]
    .map((node) => ({
      id: node.id,
      type: node.type,
      parentId: node.parentId,
      childIds: [...node.childIds],
      fills: node.fills.length,
      strokes: node.strokes.length,
      effects: node.effects.length,
      bindings: Object.keys(node.boundVariables).length,
      overrides: node.instanceOverrides.self.size + node.instanceOverrides.descendants.size
    }))
    .sort((left, right) => left.id.localeCompare(right.id))
}

/** Run `edit` from an empty history, then undo and redo all of it. */
async function expectRoundTrip(editor: Editor, edit: () => void | Promise<void>): Promise<void> {
  editor.undo.clear()
  const before = layerSummary(editor.graph)
  await edit()
  const after = layerSummary(editor.graph)
  expect(after).not.toEqual(before)
  while (editor.undo.canUndo) editor.undoAction()
  expect(layerSummary(editor.graph)).toEqual(before)
  while (editor.undo.canRedo) editor.redoAction()
  expect(layerSummary(editor.graph)).toEqual(after)
}

describe('editor operations on layers that hold shared empty values', () => {
  test('restyle, duplicate, group, and delete', async () => {
    const editor = await editorWithRenderer()
    const [rect, ellipse, line, , , frame] = defaultLayers(editor)
    await expectRoundTrip(editor, () => {
      editor.updateNodeWithUndo(rect, {
        fills: [RED],
        strokes: [{ ...RED, weight: 2, align: 'INSIDE' }]
      })
      editor.updateNodeWithUndo(rect, { effects: [], fills: [] })
      editor.updateNodeWithUndo(ellipse, { dashPattern: [4, 2], exportSettings: [] })
      editor.setOpacity(0.5)
      editor.setLayoutMode(frame, 'VERTICAL')
      editor.setLayoutMode(frame, 'NONE')
      editor.select([rect, ellipse])
      editor.duplicateSelected()
      editor.select([rect, ellipse])
      editor.groupSelected()
      editor.select([line])
      editor.deleteSelected()
    })
  })

  test('boolean, flatten, outline stroke, wrap in auto layout, and layer type', async () => {
    const editor = await editorWithRenderer()
    const [rect, ellipse, line, star, polygon, frame] = defaultLayers(editor)
    await expectRoundTrip(editor, () => {
      editor.select([rect, ellipse])
      editor.booleanOperationSelected('UNION')
      editor.select([star])
      editor.flattenSelected()
      editor.updateNodeWithUndo(line, { strokes: [{ ...RED, weight: 4, align: 'CENTER' }] })
      editor.select([line])
      editor.outlineStrokeSelected()
      editor.select([polygon])
      editor.wrapInAutoLayout()
      editor.convertLayerType(frame, 'GROUP')
    })
  })

  test('instances, overrides, reset, detach, and a new component', async () => {
    const editor = await editorWithRenderer()
    const page = editor.state.currentPageId
    const component = editor.graph.createNode('COMPONENT', page, { name: 'Card' })
    const label = editor.graph.createNode('TEXT', component.id, { text: 'Card' })
    editor.graph.createNode('RECTANGLE', component.id, { width: 20, height: 20 })
    await expectRoundTrip(editor, () => {
      const instanceId = editor.createInstanceFromComponent(component.id, 300, 0, page)
      if (!instanceId) throw new Error('No instance')
      const [copiedLabel] = editor.graph.getChildren(instanceId)
      editor.updateNodeWithUndo(copiedLabel.id, { fills: [RED] })
      editor.updateNodeWithUndo(label.id, { strokes: [{ ...RED, weight: 1, align: 'INSIDE' }] })
      editor.resetInstanceOverrides(instanceId)
      editor.updateNodeWithUndo(copiedLabel.id, { opacity: 0.4 })
      editor.select([instanceId])
      editor.detachInstance()
      editor.select([label.id])
      editor.createComponentFromSelection()
    })
  })

  test('copy, paste, and paste properties', async () => {
    const editor = await editorWithRenderer()
    const [rect, ellipse, , , , frame] = defaultLayers(editor)
    editor.updateNodeWithUndo(rect, { fills: [RED], effects: [] })
    editor.select([rect, ellipse, frame])
    const layers = (await editor.prepareCopy()).snapshot
    editor.select([rect])
    const properties = (await editor.prepareCopy({ properties: true })).snapshot
    if (!layers || !properties) throw new Error('Copy wrote no snapshot')
    await expectRoundTrip(editor, async () => {
      await editor.pasteSnapshot(layers)
      editor.select([ellipse, frame])
      await editor.pastePropertiesFromSnapshot(properties)
    })
  })
})
