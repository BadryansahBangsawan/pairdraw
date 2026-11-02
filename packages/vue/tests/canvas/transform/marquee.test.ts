import { afterEach, describe, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@open-pencil/core'

import { finishMarquee, handleMarqueeMove } from '#vue/canvas/transform/marquee'

let editor: Editor

afterEach(() => editor.dispose())

function marquee(from: [number, number], to: [number, number], containerId?: string, deep = false) {
  editor.clearSelection()
  handleMarqueeMove(
    editor,
    { type: 'marquee', startX: from[0], startY: from[1], containerId },
    ...to,
    deep
  )
  return [...editor.state.selectedIds]
}

const deepMarquee = (from: [number, number], to: [number, number], containerId?: string) =>
  marquee(from, to, containerId, true).toSorted()

const white = {
  type: 'SOLID' as const,
  color: { r: 1, g: 1, b: 1, a: 1 },
  opacity: 1,
  visible: true
}

/** A top-level board at 0,0 (400×400) holding a filled card at 100,100 (200×200) with two layers. */
function board() {
  editor = createEditor()
  const page = editor.state.currentPageId
  const frame = editor.graph.createNode('FRAME', page, { width: 400, height: 400, fills: [white] })
  const card = editor.graph.createNode('FRAME', frame.id, {
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    fills: [white]
  })
  const title = editor.graph.createNode('TEXT', card.id, { x: 20, y: 20, width: 60, height: 20 })
  const icon = editor.graph.createNode('RECTANGLE', card.id, {
    x: 120,
    y: 120,
    width: 40,
    height: 40
  })
  const side = editor.graph.createNode('RECTANGLE', frame.id, {
    x: 10,
    y: 10,
    width: 40,
    height: 40
  })
  return { frame, card, title, icon, side }
}

describe('marquee selection', () => {
  test('on the page, encloses a rotated frame by its drawn bounds', () => {
    editor = createEditor()
    const page = editor.state.currentPageId
    // 200×100 turned a quarter about its center: drawn at x 50…150, y −50…150.
    const frame = editor.graph.createNode('FRAME', page, { width: 200, height: 100, rotation: 90 })
    editor.graph.createNode('RECTANGLE', frame.id, { width: 20, height: 20 })
    expect(marquee([-10, -10], [210, 110])).toEqual([])
    expect(marquee([40, -60], [160, 160])).toEqual([frame.id])
  })

  test('inside a rotated frame, selects the children the marquee touches on the canvas', () => {
    editor = createEditor()
    const page = editor.state.currentPageId
    const frame = editor.graph.createNode('FRAME', page, { width: 200, height: 100, rotation: 90 })
    // Local (150…180, 40…60) is drawn near the bottom of the turned frame, around y 100…130.
    const child = editor.graph.createNode('RECTANGLE', frame.id, {
      x: 150,
      y: 40,
      width: 30,
      height: 20
    })
    expect(marquee([60, 90], [140, 140], frame.id)).toEqual([child.id])
    expect(marquee([60, -40], [140, 0], frame.id)).toEqual([])
  })
})

// Which layers a deep marquee picks is covered by packages/scene-graph/tests/basic/deep-rect-hit.test.ts.
describe('deep marquee (⌘ or Ctrl held)', () => {
  test('selects the deepest layers it touches, not their frames', () => {
    const { title, icon, side } = board()
    expect(deepMarquee([0, 0], [400, 400])).toEqual([title.id, icon.id, side.id].toSorted())
    expect(deepMarquee([110, 110], [140, 130])).toEqual([title.id])
  })

  test('a plain marquee over the same area still selects only the board', () => {
    const { frame } = board()
    expect(marquee([-10, -10], [410, 410])).toEqual([frame.id])
  })

  test('stays inside the container it started in', () => {
    const { card, title, icon } = board()
    expect(deepMarquee([0, 0], [400, 400], card.id)).toEqual([title.id, icon.id].toSorted())
  })

  test('switches between deep and plain mid-drag inside the group it started in', () => {
    const { frame, card, title, icon, side } = board()
    editor.graph.updateNode(frame.id, { fills: [] })
    editor.select([card.id, side.id])
    editor.groupSelected()
    const group = editor.graph.getNode(editor.graph.getNode(card.id)?.parentId ?? '')
    expect(group?.type).toBe('GROUP')
    const drag = { type: 'marquee' as const, startX: 0, startY: 0, containerId: group?.id }
    const selected = () => [...editor.state.selectedIds].toSorted()
    handleMarqueeMove(editor, drag, 400, 400, true)
    expect(selected()).toEqual([title.id, icon.id, side.id].toSorted())
    handleMarqueeMove(editor, drag, 400, 400, false)
    expect(selected()).toEqual([card.id, side.id].toSorted())
    handleMarqueeMove(editor, drag, 400, 400, true)
    expect(selected()).toEqual([title.id, icon.id, side.id].toSorted())
  })
})

describe('finishing a marquee', () => {
  test('a click without a drag selects the layer it was pressed on', () => {
    const { card } = board()
    editor.setMarquee({ x: 150, y: 150, width: 0, height: 0 })
    finishMarquee(editor, {
      type: 'marquee',
      startX: 150,
      startY: 150,
      containerId: card.id,
      selectOnClick: card.id
    })
    expect([...editor.state.selectedIds]).toEqual([card.id])
    expect(editor.state.marquee).toBeNull()
  })

  test('a drag keeps what the marquee selected', () => {
    const { card, title } = board()
    editor.select([title.id])
    editor.setMarquee({ x: 110, y: 110, width: 40, height: 30 })
    finishMarquee(editor, {
      type: 'marquee',
      startX: 110,
      startY: 110,
      containerId: card.id,
      selectOnClick: card.id
    })
    expect([...editor.state.selectedIds]).toEqual([title.id])
  })
})
