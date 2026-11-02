import type { Rect } from '@open-pencil/scene-graph/primitives'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { openAppMenu } from '#tests/helpers/menu'

/**
 * Menu and canvas-menu keys that the browser build binds itself rather than leaving to the
 * desktop app's native menu: Frame selection, the align keys, the boolean keys, Paste to replace,
 * Copy as PNG, and Remove auto layout.
 */
const editor = useEditorSetup()

test.beforeAll(async () => {
  await editor.page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
})

/** Two rectangles at different places, both selected; returns their IDs. */
function placeRects(first: Rect, second: Rect) {
  return editor.page.evaluate(
    ([a, b]) => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('OpenPencil store not initialized')
      const pageId = store.state.currentPageId
      const ids = [a, b].map((box) => store.graph.createNode('RECTANGLE', pageId, box).id)
      store.select(ids)
      return ids
    },
    [first, second] as const
  )
}

function boxes(ids: string[]) {
  return editor.page.evaluate((nodeIds) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return nodeIds.map((id) => {
      const node = store.graph.getNode(id)
      return node ? { x: node.x, y: node.y, width: node.width, height: node.height } : null
    })
  }, ids)
}

function pageChildren() {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return store.graph
      .getChildren(store.state.currentPageId)
      .map((node) => ({ id: node.id, type: node.type, childIds: [...node.childIds] }))
  })
}

/** Presses a key and reports whether the app took it from the browser. */
async function pressPrevented(key: string, code: string) {
  await editor.page.evaluate((expected) => {
    delete document.documentElement.dataset.observedPrevented
    const listener = (event: KeyboardEvent) => {
      if (event.code !== expected) return
      window.removeEventListener('keydown', listener)
      // Read after every capture listener ran, once the event finished dispatching.
      queueMicrotask(() => {
        document.documentElement.dataset.observedPrevented = String(event.defaultPrevented)
      })
    }
    window.addEventListener('keydown', listener)
  }, code)
  await editor.page.keyboard.press(key)
  await expect
    .poll(() => editor.page.evaluate(() => document.documentElement.dataset.observedPrevented))
    .toBeDefined()
  return editor.page.evaluate(() => document.documentElement.dataset.observedPrevented === 'true')
}

test.beforeEach(async () => {
  await editor.canvas.clearCanvas()
})

test('⌥⌘G wraps the selection in a frame', async () => {
  const ids = await placeRects(
    { x: 100, y: 100, width: 60, height: 60 },
    { x: 220, y: 140, width: 60, height: 60 }
  )
  await editor.page.keyboard.press('ControlOrMeta+Alt+KeyG')
  await editor.canvas.waitForRender()

  const children = await pageChildren()
  expect(children).toHaveLength(1)
  expect(children[0]?.type).toBe('FRAME')
  expect(children[0]?.childIds.toSorted()).toEqual(ids.toSorted())
})

test('⌥A, ⌥D, ⌥W, ⌥S, ⌥H and ⌥V align the selection', async () => {
  const first = { x: 100, y: 100, width: 60, height: 40 }
  const second = { x: 300, y: 260, width: 100, height: 80 }

  const cases: { key: string; check: (a: Rect, b: Rect) => boolean }[] = [
    { key: 'Alt+KeyA', check: (a, b) => a.x === b.x },
    { key: 'Alt+KeyD', check: (a, b) => a.x + a.width === b.x + b.width },
    { key: 'Alt+KeyH', check: (a, b) => a.x + a.width / 2 === b.x + b.width / 2 },
    { key: 'Alt+KeyW', check: (a, b) => a.y === b.y },
    { key: 'Alt+KeyS', check: (a, b) => a.y + a.height === b.y + b.height },
    { key: 'Alt+KeyV', check: (a, b) => a.y + a.height / 2 === b.y + b.height / 2 }
  ]
  for (const { key, check } of cases) {
    await editor.canvas.clearCanvas()
    const ids = await placeRects(first, second)
    expect(await pressPrevented(key, key.replace('Alt+', ''))).toBe(true)
    await editor.canvas.waitForRender()
    const [a, b] = await boxes(ids)
    if (!a || !b) throw new Error('Expected both rectangles')
    expect(check(a, b), key).toBe(true)
  }
})

test('⌥⇧U unions the selection', async () => {
  await placeRects(
    { x: 100, y: 100, width: 80, height: 80 },
    { x: 140, y: 140, width: 80, height: 80 }
  )
  await editor.page.keyboard.press('Alt+Shift+KeyU')
  await editor.canvas.waitForRender()

  const children = await pageChildren()
  expect(children).toHaveLength(1)
  expect(children[0]?.type).toBe('BOOLEAN_OPERATION')
})

test('⇧⌘R pastes the copied layer in place of the selection, without reloading', async () => {
  await editor.canvas.drawRect(100, 150, 120, 80)
  const copyMenu = await openAppMenu(editor.page, 'Edit')
  await copyMenu.getByRole('menuitem', { name: /^Copy/ }).click()
  await expect
    .poll(() =>
      editor.page.evaluate(async () => {
        try {
          const [item] = await navigator.clipboard.read()
          return item?.types ?? []
        } catch {
          return []
        }
      })
    )
    .toContain('text/html')

  await editor.canvas.drawRect(400, 150, 60, 60)
  const children = await pageChildren()
  const target = children.at(-1)?.id
  if (!target) throw new Error('Expected the target rectangle')

  expect(await pressPrevented('ControlOrMeta+Shift+KeyR', 'KeyR')).toBe(true)
  await expect.poll(async () => (await pageChildren()).map((node) => node.id)).not.toContain(target)
  expect(await pageChildren()).toHaveLength(children.length)
})

test('⇧⌘C copies the selection as a PNG image', async () => {
  await editor.canvas.drawRect(100, 150, 120, 80)
  await editor.page.evaluate(() => navigator.clipboard.writeText(''))

  expect(await pressPrevented('ControlOrMeta+Shift+KeyC', 'KeyC')).toBe(true)
  await expect
    .poll(() =>
      editor.page.evaluate(async () => {
        try {
          const [item] = await navigator.clipboard.read()
          return item?.types ?? []
        } catch {
          return []
        }
      })
    )
    .toContain('image/png')
})

test('⌥⇧A removes auto layout from every selected frame in one undo step', async () => {
  const ids = await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const pageId = store.state.currentPageId
    const frames = [
      store.graph.createNode('FRAME', pageId, { x: 100, y: 100, width: 120, height: 120 }),
      store.graph.createNode('FRAME', pageId, { x: 300, y: 100, width: 120, height: 120 })
    ]
    for (const frame of frames) store.setLayoutMode(frame.id, 'VERTICAL')
    store.select(frames.map((frame) => frame.id))
    return frames.map((frame) => frame.id)
  })
  const layoutModes = () =>
    editor.page.evaluate((nodeIds) => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('OpenPencil store not initialized')
      return nodeIds.map((id) => store.graph.getNode(id)?.layoutMode)
    }, ids)

  await editor.page.keyboard.press('Shift+Alt+KeyA')
  await expect.poll(layoutModes).toEqual(['NONE', 'NONE'])

  await editor.page.keyboard.press('ControlOrMeta+KeyZ')
  await expect.poll(layoutModes).toEqual(['VERTICAL', 'VERTICAL'])
})
