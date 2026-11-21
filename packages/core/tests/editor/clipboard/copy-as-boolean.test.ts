import { describe, expect, test } from 'bun:test'

import type { CanvasKit } from 'canvaskit-wasm'

import type { SkiaRenderer } from '#core/canvas'
import type { EditorContext } from '#core/editor/types'
import { createClipboardExportActions } from '#core/editor/clipboard/export'
import { headlessRenderer } from '#core/io/formats/raster/headless'

import { createEditor, type Editor } from '@pairdraw/core/editor'

/** A Union of two overlapping rectangles, as the editor's boolean command makes it. */
function authored(): { editor: Editor; booleanId: string } {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const first = editor.graph.createNode('RECTANGLE', pageId, { width: 40, height: 40 })
  const second = editor.graph.createNode('RECTANGLE', pageId, { x: 20, width: 40, height: 40 })
  editor.select([first.id, second.id])
  const booleanId = editor.booleanOperationSelected('UNION')
  if (!booleanId) throw new Error('No boolean created')
  return { editor, booleanId }
}

/** The renderer, counting every property an export reads from it. */
function counted(renderer: SkiaRenderer): { renderer: SkiaRenderer; reads: () => number } {
  let reads = 0
  const wrapping = new Proxy(renderer, {
    get(target, property, receiver) {
      reads += 1
      return Reflect.get(target, property, receiver)
    }
  })
  return { renderer: wrapping, reads: () => reads }
}

/** A host context, as the app gives the clipboard actions: its own graph and drawing renderer. */
function context(editor: Editor, renderer: SkiaRenderer, canvasKit: CanvasKit): EditorContext {
  const host: Pick<EditorContext, 'graph' | 'state' | 'getCk' | 'getRenderer'> = {
    graph: editor.graph,
    state: editor.state,
    getCk: () => canvasKit,
    getRenderer: () => renderer
  }
  return host as EditorContext
}

describe('copying an authored boolean', () => {
  test('Copy as HTML computes its path through the app’s renderer', async () => {
    const { renderer: host, reads } = counted((await headlessRenderer()).renderer)
    const { ck } = await headlessRenderer()
    const { editor, booleanId } = authored()
    const actions = createClipboardExportActions(context(editor, host, ck))
    const before = reads()
    const html = await actions.copySelectionAsHTML([booleanId])
    expect(html).not.toBeNull()
    // A headless fallback would never read the renderer the app already draws with.
    expect(reads()).toBeGreaterThan(before)
    expect(html).toContain('<path')
    expect(html).not.toContain('<rect')
  })

  test('Copy as SVG writes the boolean’s result path, not its operands', async () => {
    const { renderer: host } = counted((await headlessRenderer()).renderer)
    const { ck } = await headlessRenderer()
    const { editor, booleanId } = authored()
    const actions = createClipboardExportActions(context(editor, host, ck))
    const svg = await actions.copySelectionAsSVG([booleanId])
    expect(svg).toContain('<path')
    expect(svg).not.toContain('<rect')
  })
})
