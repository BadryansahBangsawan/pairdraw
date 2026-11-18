import { describe, expect, test } from 'bun:test'

import type { CanvasKit } from 'canvaskit-wasm'

import { iconify } from '@pairdraw/core/icons'
import { TextEditor } from '@pairdraw/core/text'
import { SceneGraph } from '@pairdraw/scene-graph'
import { UndoManager } from '@pairdraw/scene-graph/undo'

import { createStructureActions } from '#core/editor/structure'
import { createTextActions } from '#core/editor/text'
import type { EditorContext, EditorState } from '#core/editor/types'
import { expectDefined, getNodeOrThrow } from '#core-tests/helpers/assert'

function setup() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0].id
  const undo = new UndoManager()
  const textEditor = new TextEditor({} as CanvasKit)

  const state = {
    editingTextId: null,
    currentPageId: pageId,
    selectedIds: new Set<string>(),
    renderVersion: 0,
    sceneVersion: 0,
    canvasVersion: 0
  } as EditorState

  const ctx: EditorContext = {
    graph,
    undo,
    state,
    requestRender: () => undefined,
    requestRefresh: () => undefined,
    getUserName: () => '',
    requestRepaint: () => undefined,
    getTextEditor: () => textEditor,
    getRenderer: () => null,
    getRenderers: () => [],
    runLayoutForNode: () => undefined,
    runMutationWithLayout: async (operation) => operation(),
    getCk: () => null,
    loadFont: async () => null,
    getViewportSize: () => ({ width: 800, height: 600 }),
    icons: iconify,
    subscribeToGraph: () => undefined,
    resolveFigmaClipboardImages: null,
    beginInteractiveEdit: () => () => undefined,
    onEditorEvent: () => () => undefined,
    emitEditorEvent: () => undefined,
    setSelectedIds: () => undefined,
    setActiveTool: () => undefined,
    setNavigationPhase: () => undefined
  } as EditorContext

  const textNode = graph.createNode('TEXT', pageId, {
    width: 100,
    height: 20
  })

  const text = createTextActions(ctx)
  const structure = createStructureActions(ctx)
  /** Types `value` into the node as a person would and commits it. */
  const type = (value: string) => {
    text.startTextEditing(textNode.id)
    textEditor.selectAll()
    textEditor.insert(value, getNodeOrThrow(graph, textNode.id))
    text.commitTextEdit()
  }
  return { graph, undo, state, textNode, text, structure, type }
}

describe('a text layer is named by its text', () => {
  test('a new text layer is called Text', () => {
    const { graph, textNode } = setup()
    expect(graph.getNode(textNode.id)).toMatchObject({ name: 'Text', autoRename: true })
  })

  test('typing names the layer, trimmed and on one line', () => {
    const { graph, textNode, type } = setup()
    type('  Inside frame\nsecond line  ')
    expect(graph.getNode(textNode.id)).toMatchObject({
      text: '  Inside frame\nsecond line  ',
      name: 'Inside frame second line',
      autoRename: true
    })
  })

  test('emptying it takes the type name back', () => {
    const { graph, textNode, type } = setup()
    type('Heading')
    expect(graph.getNode(textNode.id)?.name).toBe('Heading')
    type('   ')
    expect(graph.getNode(textNode.id)).toMatchObject({ name: 'Text', autoRename: true })
  })

  test('one undo restores the text, its name and whether the name follows it', () => {
    const { graph, undo, textNode, type } = setup()
    type('Heading')
    undo.undo()
    expect(graph.getNode(textNode.id)).toMatchObject({ text: '', name: 'Text', autoRename: true })
    undo.redo()
    expect(graph.getNode(textNode.id)).toMatchObject({ text: 'Heading', name: 'Heading' })
  })

  test('renaming it keeps the name through later edits, and undo takes the following back', () => {
    const { graph, undo, textNode, type, structure } = setup()
    type('First')
    structure.renameNode(textNode.id, 'Hero title')
    expect(graph.getNode(textNode.id)).toMatchObject({ name: 'Hero title', autoRename: false })
    type('Second')
    expect(graph.getNode(textNode.id)).toMatchObject({
      text: 'Second',
      name: 'Hero title',
      autoRename: false
    })
    undo.undo()
    undo.undo()
    expect(graph.getNode(textNode.id)).toMatchObject({ name: 'First', autoRename: true })
  })

  test('renaming a selection keeps those names too, in one undo step', () => {
    const { graph, textNode, type, structure, state } = setup()
    type('First')
    state.selectedIds = new Set([textNode.id])
    structure.renameSelected({ match: 'First', replacement: 'Chosen', startNumber: 1 })
    expect(graph.getNode(textNode.id)).toMatchObject({ name: 'Chosen', autoRename: false })
    type('Second')
    expect(graph.getNode(textNode.id)?.name).toBe('Chosen')
    const renamed = expectDefined(graph.getNode(textNode.id))
    expect(renamed.autoRename).toBe(false)
  })
})
