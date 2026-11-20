import { afterEach, describe, expect, test } from 'bun:test'

import { createEditor, type Editor } from '@pairdraw/core'
import type { SceneNode } from '@pairdraw/scene-graph'

import { handleSelectDown, type HitTestFns } from '#vue/shared/input/select'
import type { DragState } from '#vue/shared/input/types'

// Figma: ⌘ (Ctrl on Windows and Linux) + drag from a board's empty background draws a marquee that
// selects nested layers, as a plain drag there draws a plain one; ⌘ + drag anywhere else, a nested
// frame's background included, selects the deepest layer and moves it.

let editor: Editor

afterEach(() => editor.dispose())

const white = {
  type: 'SOLID' as const,
  color: { r: 1, g: 1, b: 1, a: 1 },
  opacity: 1,
  visible: true
}

interface Modifiers {
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
}

function setup() {
  editor = createEditor()
  const pageId = editor.state.currentPageId
  const frame = editor.graph.createNode('FRAME', pageId, {
    width: 400,
    height: 400,
    fills: [white]
  })
  const card = editor.graph.createNode('FRAME', frame.id, {
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    fills: [white]
  })
  const icon = editor.graph.createNode('RECTANGLE', card.id, {
    x: 20,
    y: 20,
    width: 40,
    height: 40
  })
  let label: SceneNode | null = null
  const scope = () => editor.state.enteredContainerId ?? editor.state.currentPageId
  const fns: HitTestFns = {
    hitTestInScope: (cx, cy, deep) =>
      deep
        ? editor.graph.hitTestDeep(cx, cy, scope())
        : editor.graph.hitTestSelectable(cx, cy, scope(), editor.state.selectedIds),
    isInsideContainerBounds: (cx, cy, id) => editor.graph.isPointInNode(id, cx, cy),
    hitTestFrameTitle: () => label,
    hitTestSectionTitle: () => null,
    hitTestComponentLabel: () => null
  }
  const pressAt = (x: number, y: number, modifiers: Modifiers = {}) => {
    const event = {
      altKey: false,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
      ...modifiers
    } as MouseEvent
    let drag: DragState | null = null
    handleSelectDown(
      event,
      x,
      y,
      x,
      y,
      editor,
      fns,
      () => false,
      () => false,
      (next) => {
        drag = next
      }
    )
    return drag as DragState | null
  }
  const showLabel = (node: SceneNode | null) => {
    label = node
  }
  return { frame, card, icon, pressAt, showLabel }
}

describe('⌘ press on a board background', () => {
  test.each([{ metaKey: true }, { ctrlKey: true }])(
    'starts a deep marquee in that board (%o)',
    (modifiers) => {
      const { frame, pressAt } = setup()
      const drag = pressAt(350, 50, modifiers)
      expect(drag).toMatchObject({
        type: 'marquee',
        containerId: frame.id,
        selectOnClick: frame.id
      })
      expect(editor.state.selectedIds.size).toBe(0)
    }
  )

  test('without ⌘ the same press starts a plain marquee there', () => {
    const { frame, pressAt } = setup()
    expect(pressAt(350, 50)).toMatchObject({ type: 'marquee', containerId: frame.id })
  })

  test('on a top-level auto layout frame, selects and moves it', () => {
    const { frame, pressAt } = setup()
    editor.graph.updateNode(frame.id, { layoutMode: 'VERTICAL' })
    expect(pressAt(350, 50, { metaKey: true })?.type).toBe('move')
    expect([...editor.state.selectedIds]).toEqual([frame.id])
  })

  test('on a locked board, marquees the page rather than the board', () => {
    const { frame, pressAt } = setup()
    editor.graph.updateNode(frame.id, { locked: true })
    // A locked layer is skipped with everything inside it, so ⌘ does not enter the board: the
    // press marquees the page, where the board and its siblings are selected.
    expect(pressAt(350, 50, { metaKey: true })).toMatchObject({
      type: 'marquee',
      containerId: undefined
    })
  })

  test("on a frame's label, keeps the usual press", () => {
    const { frame, pressAt, showLabel } = setup()
    showLabel(frame)
    expect(pressAt(350, 50, { metaKey: true })?.type).not.toBe('marquee')
  })
})

describe('⌘ press on a nested container', () => {
  test.each([
    ['frame', 'FRAME'],
    ['instance', 'INSTANCE'],
    ['component', 'COMPONENT']
  ] as const)('selects an unselected %s by its background and moves it', (_, type) => {
    const { frame, pressAt } = setup()
    const nested = editor.graph.createNode(type, frame.id, {
      x: 20,
      y: 320,
      width: 200,
      height: 60,
      fills: [white]
    })
    editor.graph.createNode('RECTANGLE', nested.id, { width: 20, height: 20 })
    expect(pressAt(150, 350, { metaKey: true })?.type).toBe('move')
    expect([...editor.state.selectedIds]).toEqual([nested.id])
  })

  test('without ⌘, selects the unselected card and moves it', () => {
    const { card, pressAt } = setup()
    expect(pressAt(250, 250)?.type).toBe('move')
    expect([...editor.state.selectedIds]).toEqual([card.id])
  })

  test('on a layer, still selects that deepest layer and moves it', () => {
    const { icon, pressAt } = setup()
    expect(pressAt(130, 130, { metaKey: true })?.type).toBe('move')
    expect([...editor.state.selectedIds]).toEqual([icon.id])
  })

  test('with Shift, adds the container to the selection', () => {
    const { card, icon, pressAt } = setup()
    editor.select([icon.id])
    expect(pressAt(250, 250, { metaKey: true, shiftKey: true })?.type).not.toBe('marquee')
    expect(editor.state.selectedIds.has(card.id)).toBe(true)
  })
})

describe('⌘ press inside an entered container', () => {
  test('starts a marquee on its empty space, where a plain press starts none', () => {
    const { card, pressAt } = setup()
    editor.graph.updateNode(card.id, { fills: [] })
    editor.enterContainer(card.id)
    expect(pressAt(250, 250)).toBeNull()
    editor.enterContainer(card.id)
    expect(pressAt(250, 250, { metaKey: true })?.type).toBe('marquee')
    expect(editor.state.enteredContainerId).toBe(card.id)
  })
})
