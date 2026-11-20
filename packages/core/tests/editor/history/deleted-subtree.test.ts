import { describe, expect, spyOn, test } from 'bun:test'

import { captureDocumentChange } from '#core/editor/history/document-change'
import { expectDefined } from '#core-tests/helpers/assert'

import { createEditor } from '@pairdraw/core'
import type { SceneNode } from '@pairdraw/scene-graph'

/**
 * A screen in vertical auto layout holding a row in horizontal auto layout, an instance of a
 * button with its label overridden, and layers bound to variables.
 */
function screen() {
  const editor = createEditor()
  const { graph } = editor
  const pageId = editor.state.currentPageId
  const collection = graph.createCollection('Theme')
  const gap = graph.createVariable('Gap', 'FLOAT', collection.id, 16)
  const brand = graph.createVariable('Brand', 'COLOR', collection.id, { r: 0, g: 0.4, b: 1, a: 1 })

  const button = graph.createNode('COMPONENT', pageId, { name: 'Button', x: 900 })
  graph.createNode('TEXT', button.id, { name: 'Label', text: 'Go' })

  const root = graph.createNode('FRAME', pageId, {
    name: 'Screen',
    layoutMode: 'VERTICAL',
    itemSpacing: 8,
    paddingTop: 24
  })
  const row = graph.createNode('FRAME', root.id, {
    name: 'Row',
    layoutMode: 'HORIZONTAL',
    layoutGrow: 1,
    layoutAlignSelf: 'STRETCH'
  })
  graph.bindVariable(row.id, 'itemSpacing', gap.id)
  for (let index = 0; index < 3; index++) {
    const cell = graph.createNode('RECTANGLE', row.id, {
      name: `Cell ${index}`,
      width: 40,
      fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }]
    })
    graph.bindVariable(cell.id, 'fills/0/color', brand.id)
  }
  const instance = expectDefined(graph.createInstance(button.id, root.id), 'instance')
  const label = expectDefined(graph.getChildren(instance.id)[0], 'label')
  editor.updateNodeWithUndo(label.id, { text: 'Buy now' })
  // Laid out as the canvas leaves it, which undo lays out again.
  editor.runLayoutForNode(root.id)
  return { editor, root, instance, button }
}

/** Every layer under `rootId`, the root included, as plain copies by id. */
function subtree(editor: ReturnType<typeof screen>['editor'], rootId: string) {
  const copies = new Map<string, SceneNode>()
  const pending = [rootId]
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    const node = expectDefined(editor.graph.getNode(id), id)
    copies.set(id, structuredClone(node))
    pending.push(...node.childIds)
  }
  return copies
}

/**
 * `subtree` without the fields each layer marks as edited for `.fig` export. Delete's undo puts
 * layers back through `createNode`, which starts that list afresh; it did so before this change
 * too, so the comparison leaves it out.
 */
function withoutEditMarks(layers: Map<string, SceneNode>) {
  return new Map(
    [...layers].map(([id, node]) => [id, { ...node, source: { ...node.source, editedFields: [] } }])
  )
}

describe('undoing a deleted subtree', () => {
  test('brings back every layer exactly, through repeated undo and redo', () => {
    const { editor, root, instance } = screen()
    const pageId = editor.state.currentPageId
    const before = subtree(editor, root.id)
    const pageChildren = [...expectDefined(editor.graph.getNode(pageId)).childIds]

    const finish = captureDocumentChange(editor.graph, pageId)
    editor.graph.deleteNode(root.id)
    const change = finish()

    for (let cycle = 0; cycle < 3; cycle++) {
      editor.restoreDocumentChange(change, 'before')
      expect(subtree(editor, root.id)).toEqual(before)
      expect(editor.graph.getNode(pageId)?.childIds).toEqual(pageChildren)
      expect(editor.graph.getInstances(expectDefined(instance.componentId))).toHaveLength(1)
      // What is brought back is the document's own: changing it leaves the record as it was.
      const cell = expectDefined(editor.graph.getNode(root.id)?.childIds[0], 'row')
      editor.graph.updateNode(cell, { name: 'Changed', fills: [] })
      editor.restoreDocumentChange(change, 'after')
      expect(editor.graph.getNode(root.id)).toBeUndefined()
    }
  })

  test('records each deleted layer without copying it again', () => {
    const { editor, root } = screen()
    for (let index = 0; index < 500; index++) {
      editor.graph.createNode('RECTANGLE', root.id, { name: `Extra ${index}` })
    }
    const pageId = editor.state.currentPageId
    const finish = captureDocumentChange(editor.graph, pageId)
    editor.graph.deleteNode(root.id)
    const clone = spyOn(globalThis, 'structuredClone')
    try {
      const change = finish()
      expect(change.deleted.length).toBeGreaterThan(500)
      expect(clone.mock.calls.length).toBeLessThan(10)
    } finally {
      clone.mockRestore()
    }
  })

  test('undo sends one created event per layer brought back and nothing else', () => {
    const { editor, root } = screen()
    const pageId = editor.state.currentPageId
    const count = subtree(editor, root.id).size
    const finish = captureDocumentChange(editor.graph, pageId)
    editor.graph.deleteNode(root.id)
    const change = finish()

    let created = 0
    let deleted = 0
    let updated = 0
    const stop = editor.graph.onNodeEvents({
      created: () => created++,
      deleted: () => deleted++,
      updated: () => updated++
    })
    editor.restoreDocumentChange(change, 'before')
    stop()
    expect(created).toBe(count)
    expect(deleted).toBe(0)
    // Layout may settle sizes after the layers are back; nothing else rewrites them.
    expect(updated).toBeLessThanOrEqual(count)
  })

  test('Delete and its undo bring back every layer exactly, without a deep copy per layer', () => {
    const { editor, root, instance } = screen()
    for (let index = 0; index < 500; index++) {
      editor.graph.createNode('RECTANGLE', root.id, { name: `Extra ${index}` })
    }
    editor.runLayoutForNode(root.id)
    const before = subtree(editor, root.id)
    editor.select([root.id])

    const clone = spyOn(globalThis, 'structuredClone')
    try {
      editor.deleteSelected()
      expect(clone.mock.calls.length).toBeLessThan(10)
    } finally {
      clone.mockRestore()
    }
    expect(editor.graph.getNode(root.id)).toBeUndefined()

    for (let cycle = 0; cycle < 3; cycle++) {
      editor.undoAction()
      expect(withoutEditMarks(subtree(editor, root.id))).toEqual(withoutEditMarks(before))
      expect(editor.graph.getInstances(expectDefined(instance.componentId))).toHaveLength(1)
      // Editing what came back leaves the undo record as it was.
      editor.graph.updateNode(root.id, { name: 'Changed', paddingTop: 2 })
      editor.redoAction()
      expect(editor.graph.getNode(root.id)).toBeUndefined()
    }
  })
})
