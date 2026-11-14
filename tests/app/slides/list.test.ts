import { describe, expect, test } from 'bun:test'

import { createEditor } from '@pairdraw/core'

import type { EditorStore } from '@/app/editor/active-store'
import { moveSlideBy, moveSlideTo } from '@/app/slides/list'

import { asDouble } from '#tests/helpers/doubles'

function deck() {
  const editor = createEditor({ getViewportSize: () => ({ width: 800, height: 600 }) })
  const pageId = editor.state.currentPageId
  for (const name of ['Cover', 'Agenda', 'Thanks']) {
    editor.graph.createNode('FRAME', pageId, { name, width: 100, height: 100 })
  }
  const store = asDouble<EditorStore>(editor)
  const names = () => editor.getSlides().map((slide) => slide.name)
  const id = (name: string) => editor.getSlides().find((slide) => slide.name === name)?.id ?? ''
  return { editor, store, names, id }
}

describe('Slides panel order', () => {
  test('a drop moves a slide to its place in the slide order', () => {
    const { store, names, id } = deck()
    expect(moveSlideTo(store, id('Cover'), 2)).toBe(true)
    expect(names()).toEqual(['Agenda', 'Thanks', 'Cover'])
    expect(moveSlideTo(store, id('Cover'), 0)).toBe(true)
    expect(names()).toEqual(['Cover', 'Agenda', 'Thanks'])
  })

  test('Alt+arrow moves a slide one place, and not past either end', () => {
    const { editor, store, names, id } = deck()
    expect(moveSlideBy(store, id('Agenda'), -1)).toBe(true)
    expect(names()).toEqual(['Agenda', 'Cover', 'Thanks'])
    expect(moveSlideBy(store, id('Agenda'), -1)).toBe(false)
    expect(moveSlideBy(store, id('Thanks'), 1)).toBe(false)
    editor.undoAction()
    expect(names()).toEqual(['Cover', 'Agenda', 'Thanks'])
  })
})
