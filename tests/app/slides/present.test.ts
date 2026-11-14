import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'

import type { EditorStore } from '@/app/editor/active-store'
import { toast } from '@/app/shell/ui'
import { exportSlidesToPDF, exportSlidesToPPTX } from '@/app/slides/present'

import { asDouble } from '#tests/helpers/doubles'

/**
 * A deck whose slide order differs from the page's raw children: two slides sit in a section,
 * and a loose shape and a hidden frame are no slides at all.
 */
function deck() {
  const editor = createEditor({ getViewportSize: () => ({ width: 800, height: 600 }) })
  const pageId = editor.state.currentPageId
  const frame = (name: string, parentId = pageId, visible = true) =>
    editor.graph.createNode('FRAME', parentId, { name, width: 100, height: 100, visible }).id
  const cover = frame('Cover')
  editor.graph.createNode('RECTANGLE', pageId, { name: 'Loose shape' })
  const section = editor.graph.createNode('SECTION', pageId, { name: 'Middle' }).id
  const agenda = frame('Agenda', section)
  const details = frame('Details', section)
  frame('Hidden', pageId, false)
  const thanks = frame('Thanks')
  // Selected in another order than the slides go.
  editor.select([thanks, cover])
  const exportTarget = mock(async () => undefined)
  const store = asDouble<EditorStore>(Object.assign(editor, { exportTarget }))
  return { editor, store, exportTarget, slides: [cover, agenda, details, thanks] }
}

// The failure toast is app-wide state; later tests expect none.
afterEach(() => {
  for (const entry of toast.toasts.value) toast.remove(entry.id)
})

describe('slide export', () => {
  test('PowerPoint gets every slide, in the order Present shows them', async () => {
    const { editor, store, exportTarget, slides } = deck()
    expect(editor.getSlides().map((slide) => slide.id)).toEqual(slides)
    await exportSlidesToPPTX(store)
    expect(exportTarget).toHaveBeenCalledWith({ scope: 'selection', nodeIds: slides }, 'pptx')
  })

  test('PDF gets the same slides in the same order', async () => {
    const { store, exportTarget, slides } = deck()
    await exportSlidesToPDF(store)
    expect(exportTarget).toHaveBeenCalledWith({ scope: 'selection', nodeIds: slides }, 'pdf')
  })

  test('a failed PowerPoint export is reported instead of rejecting', async () => {
    const { store, exportTarget } = deck()
    exportTarget.mockImplementation(async () => {
      throw new Error('No visible nodes to export')
    })
    const errors = spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      await expect(exportSlidesToPPTX(store)).resolves.toBeUndefined()
      expect(errors).toHaveBeenCalled()
      expect(toast.toasts.value.map((entry) => entry.variant)).toEqual(['error'])
    } finally {
      errors.mockRestore()
    }
  })
})
