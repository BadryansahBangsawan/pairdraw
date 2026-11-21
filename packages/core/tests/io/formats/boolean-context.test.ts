import { describe, expect, test } from 'bun:test'

import type { SkiaRenderer } from '#core/canvas'
import { BUILTIN_IO_FORMATS, IORegistry } from '#core/io'
import { headlessRenderer } from '#core/io/formats/raster/headless'

import { createEditor, type Editor } from '@pairdraw/core/editor'

const io = new IORegistry(BUILTIN_IO_FORMATS)

/** A Union of two overlapping rectangles, as the editor's boolean command makes it. */
function authored(): { editor: Editor; booleanId: string } {
  const editor = createEditor()
  const pageId = editor.state.currentPageId
  const first = editor.graph.createNode('RECTANGLE', pageId, { width: 40, height: 40 })
  const second = editor.graph.createNode('RECTANGLE', pageId, {
    x: 20,
    width: 40,
    height: 40
  })
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

// An export that ignores the context builds its own offscreen renderer, so a document with an
// authored boolean loads CanvasKit a second time in the app, which already draws with one.
describe('an export with a host renderer', () => {
  test('computes every boolean path through the renderer the context provides', async () => {
    const { ck } = await headlessRenderer()
    const { editor, booleanId } = authored()
    for (const format of ['svg', 'html', 'jsx', 'tailwind-jsx'] as const) {
      const host = counted((await headlessRenderer()).renderer)
      const result = await io.exportContent(
        format,
        { graph: editor.graph, target: { scope: 'node', nodeId: booleanId } },
        undefined,
        { canvasKit: ck, renderer: host.renderer }
      )
      expect(typeof result.data).toBe('string')
      expect(host.reads()).toBeGreaterThan(0)
    }
  })
})
