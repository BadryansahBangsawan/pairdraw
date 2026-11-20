import { afterEach, expect, mock, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'
import type { SkiaRenderer } from '@pairdraw/core/canvas'

import { fontManager } from '#core/text/font/manager'

const editors: Array<ReturnType<typeof createEditor>> = []

afterEach(() => {
  for (const editor of editors.splice(0)) editor.dispose()
})

/** An editor drawing through a renderer that records which layers it is asked to redraw. */
function setup() {
  const editor = createEditor()
  editors.push(editor)
  const text = editor.graph.createNode('TEXT', editor.state.currentPageId, { text: 'Held' })
  const invalidateNodePicture = mock((_nodeId: string) => undefined)
  const renderer: Partial<SkiaRenderer> = { invalidateNodePicture, measureTextNode: undefined }
  editor.setCanvasKit({} as Parameters<typeof editor.setCanvasKit>[0], renderer as SkiaRenderer)
  return { editor, invalidateNodePicture, text }
}

test('text held back while its fonts were prepared is drawn again once the hold ends', () => {
  const { invalidateNodePicture, text } = setup()
  fontManager.blockNodesUntilFontsResolve([text.id])
  expect(invalidateNodePicture).not.toHaveBeenCalled()

  fontManager.unblockNodes([text.id])
  expect(invalidateNodePicture.mock.calls).toEqual([[text.id]])
})

test('text of another document is left to that document’s renderers', () => {
  const { invalidateNodePicture } = setup()
  fontManager.blockNodesUntilFontsResolve(['elsewhere'])
  fontManager.unblockNodes(['elsewhere'])
  expect(invalidateNodePicture).not.toHaveBeenCalled()
})

test('a disposed editor no longer redraws', () => {
  const { editor, invalidateNodePicture, text } = setup()
  editors.splice(editors.indexOf(editor), 1)
  editor.dispose()
  fontManager.blockNodesUntilFontsResolve([text.id])
  fontManager.unblockNodes([text.id])
  expect(invalidateNodePicture).not.toHaveBeenCalled()
})
