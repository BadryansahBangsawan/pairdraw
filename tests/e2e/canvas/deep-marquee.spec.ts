import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

// Figma: ⌘ (Ctrl on Windows and Linux) + drag from empty space or a board's background draws a
// marquee that selects nested layers; ⌘ + drag from a nested frame's background moves that frame.

/** The view offset the scene is shown at, at zoom 1, so canvas points are scene points plus it. */
const PAN = 50

let canvas: CanvasHelper

/** A board holding a filled card with a title and an icon, and a badge beside the card. */
function buildScene(page: Page) {
  return page.evaluate((pan) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const pageId = store.state.currentPageId
    const white = {
      type: 'SOLID' as const,
      color: { r: 1, g: 1, b: 1, a: 1 },
      opacity: 1,
      visible: true
    }
    const board = store.graph.createNode('FRAME', pageId, {
      name: 'Board',
      width: 500,
      height: 400,
      fills: [white]
    })
    const card = store.graph.createNode('FRAME', board.id, {
      name: 'Card',
      x: 100,
      y: 100,
      width: 240,
      height: 200,
      fills: [{ ...white, color: { r: 0.9, g: 0.9, b: 0.95, a: 1 } }]
    })
    store.graph.createNode('RECTANGLE', card.id, {
      name: 'Title',
      x: 20,
      y: 20,
      width: 120,
      height: 24,
      fills: [{ ...white, color: { r: 0.2, g: 0.2, b: 0.2, a: 1 } }]
    })
    store.graph.createNode('ELLIPSE', card.id, {
      name: 'Icon',
      x: 180,
      y: 140,
      width: 40,
      height: 40,
      fills: [{ ...white, color: { r: 0.3, g: 0.5, b: 1, a: 1 } }]
    })
    store.graph.createNode('RECTANGLE', board.id, {
      name: 'Badge',
      x: 380,
      y: 120,
      width: 60,
      height: 30,
      fills: [{ ...white, color: { r: 1, g: 0.6, b: 0.2, a: 1 } }]
    })
    store.state.zoom = 1
    store.state.panX = pan
    store.state.panY = pan
    store.clearSelection()
    store.requestRender()
  }, PAN)
}

function selection(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    return [...(store?.state.selectedIds ?? [])]
      .map((id) => store?.graph.getNode(id)?.name ?? '')
      .toSorted()
  })
}

/** Where the named layer sits in its parent. */
function position(page: Page, name: string) {
  return page.evaluate((layerName) => {
    const store = window.openPencil?.getStore?.()
    const node = [...(store?.graph.nodes.values() ?? [])].find((n) => n.name === layerName)
    return node ? { x: node.x, y: node.y } : null
  }, name)
}

/** Drags between scene points with ⌘ (Ctrl on Windows and Linux) held. */
async function modDrag(page: Page, from: [number, number], to: [number, number]) {
  await page.keyboard.down('ControlOrMeta')
  await canvas.drag(from[0] + PAN, from[1] + PAN, to[0] + PAN, to[1] + PAN)
  await page.keyboard.up('ControlOrMeta')
  await canvas.waitForRender()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?test')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()
  await canvas.clearCanvas()
  await buildScene(page)
  await canvas.waitForRender()
})

test('⌘-drag from empty canvas selects the nested layers it touches', async ({ page }) => {
  await modDrag(page, [-30, -30], [460, 260])
  await expect.poll(() => selection(page)).toEqual(['Badge', 'Icon', 'Title'])
  canvas.assertNoErrors()
})

test('⌘-drag from a board’s background selects the nested layers inside it', async ({ page }) => {
  const before = await position(page, 'Board')
  // From the board's empty corner, across the card's layers and the badge.
  await modDrag(page, [20, 380], [460, 110])
  await expect.poll(() => selection(page)).toEqual(['Badge', 'Icon', 'Title'])
  expect(await position(page, 'Board')).toEqual(before)
  canvas.assertNoErrors()
})

test('⌘-drag from an unselected card’s background selects the card and moves it', async ({
  page
}) => {
  const before = await position(page, 'Card')
  await modDrag(page, [110, 280], [150, 300])
  await expect.poll(() => selection(page)).toEqual(['Card'])
  await expect.poll(() => position(page, 'Card')).not.toEqual(before)
  canvas.assertNoErrors()
})

test('releasing ⌘ mid-drag turns the marquee into a plain one at once', async ({ page }) => {
  const box = await canvas.canvas.boundingBox()
  if (!box) throw new Error('Canvas has no bounding box')
  const at = (x: number, y: number) => [box.x + x + PAN, box.y + y + PAN] as const
  await page.mouse.move(...at(20, 380))
  await page.keyboard.down('ControlOrMeta')
  await page.mouse.down()
  await page.mouse.move(...at(460, 110), { steps: 10 })
  await expect.poll(() => selection(page)).toEqual(['Badge', 'Icon', 'Title'])
  // No pointer move after the key: the board's own layers are selected instead.
  await page.keyboard.up('ControlOrMeta')
  await expect.poll(() => selection(page)).toEqual(['Badge', 'Card'])
  await page.mouse.up()
  canvas.assertNoErrors()
})
