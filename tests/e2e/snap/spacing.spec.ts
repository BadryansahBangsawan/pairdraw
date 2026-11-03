import type { Vector } from '@open-pencil/scene-graph/primitives'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear()

/** Rectangles 80 units square at `rects`, with the last one selected to drag. */
async function placeRects(rects: Vector[], objects = true) {
  await editor.page.evaluate(
    ({ rects, objects }) => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('OpenPencil store not initialized')
      store.state.snappingPreferences = { geometry: true, objects, pixelGrid: false }
      const ids = rects.map((rect) => store.createShape('RECTANGLE', rect.x, rect.y, 80, 80))
      const last = ids.at(-1)
      if (last) store.select([last])
    },
    { rects, objects }
  )
  await editor.canvas.waitForRender()
}

async function selectedPosition(): Promise<Vector> {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const id = store.state.selectedIds.values().next().value
    const node = id ? store.graph.getNode(id) : undefined
    if (!node) throw new Error('Selected node not found')
    return { x: node.x, y: node.y }
  })
}

async function snapGuides() {
  return editor.page.evaluate(() => window.openPencil?.getStore?.().state.snapGuides ?? [])
}

async function canvasBox() {
  const box = await editor.page.getByTestId('canvas-element').boundingBox()
  if (!box) throw new Error('No canvas')
  return box
}

test('a move repeats the gap between two neighbours and marks the equal gaps', async () => {
  // a and b are 40 apart; the dragged rectangle lands 40 after b, at x=340.
  await placeRects([
    { x: 100, y: 100 },
    { x: 220, y: 100 },
    { x: 480, y: 100 }
  ])
  const box = await canvasBox()

  await editor.page.mouse.move(box.x + 520, box.y + 140)
  await editor.page.mouse.down()
  await editor.page.mouse.move(box.x + 383, box.y + 140, { steps: 15 })
  expect(await selectedPosition()).toEqual({ x: 340, y: 100 })
  const guides = await snapGuides()
  expect(guides).toContainEqual({ axis: 'y', position: 140, from: 300, to: 340, spacing: true })
  expect(guides).toContainEqual({ axis: 'y', position: 140, from: 180, to: 220, spacing: true })
  if (process.platform === 'darwin') {
    expect(await editor.canvas.screenshotCanvas()).toMatchSnapshot('equal-spacing-repeat.png')
  }

  await editor.page.mouse.up()
  expect(await selectedPosition()).toEqual({ x: 340, y: 100 })
  expect(await snapGuides()).toEqual([])
  editor.canvas.assertNoErrors()
})

test('a move centres a layer between its two neighbours', async () => {
  // a ends at 180 and b starts at 340: the dragged rectangle centres at x=220, 40 from each.
  await placeRects([
    { x: 100, y: 100 },
    { x: 340, y: 100 },
    { x: 500, y: 260 }
  ])
  const box = await canvasBox()

  await editor.page.mouse.move(box.x + 540, box.y + 300)
  await editor.page.mouse.down()
  await editor.page.mouse.move(box.x + 263, box.y + 140, { steps: 15 })
  expect(await selectedPosition()).toEqual({ x: 220, y: 100 })
  const guides = await snapGuides()
  expect(guides).toContainEqual({ axis: 'y', position: 140, from: 180, to: 220, spacing: true })
  expect(guides).toContainEqual({ axis: 'y', position: 140, from: 300, to: 340, spacing: true })
  if (process.platform === 'darwin') {
    expect(await editor.canvas.screenshotCanvas()).toMatchSnapshot('equal-spacing-centre.png')
  }

  await editor.page.mouse.up()
  expect(await selectedPosition()).toEqual({ x: 220, y: 100 })
  editor.canvas.assertNoErrors()
})

test('a column snaps to equal vertical gaps', async () => {
  await placeRects([
    { x: 100, y: 100 },
    { x: 100, y: 220 },
    { x: 100, y: 480 }
  ])
  const box = await canvasBox()

  await editor.page.mouse.move(box.x + 140, box.y + 520)
  await editor.page.mouse.down()
  await editor.page.mouse.move(box.x + 140, box.y + 382, { steps: 15 })
  expect(await selectedPosition()).toEqual({ x: 100, y: 340 })
  expect(await snapGuides()).toContainEqual({
    axis: 'x',
    position: 140,
    from: 300,
    to: 340,
    spacing: true
  })
  await editor.page.mouse.up()
  editor.canvas.assertNoErrors()
})

test('Snap to objects off leaves equal gaps alone', async () => {
  await placeRects(
    [
      { x: 100, y: 100 },
      { x: 220, y: 100 },
      { x: 480, y: 100 }
    ],
    false
  )
  const box = await canvasBox()

  await editor.page.mouse.move(box.x + 520, box.y + 140)
  await editor.page.mouse.down()
  await editor.page.mouse.move(box.x + 383, box.y + 140, { steps: 15 })
  expect(await selectedPosition()).toEqual({ x: 343, y: 100 })
  expect(await snapGuides()).toEqual([])
  await editor.page.mouse.up()
  editor.canvas.assertNoErrors()
})

test('Control bypasses equal-spacing snap', async () => {
  await placeRects([
    { x: 100, y: 100 },
    { x: 220, y: 100 },
    { x: 480, y: 100 }
  ])
  const box = await canvasBox()

  await editor.page.mouse.move(box.x + 520, box.y + 140)
  await editor.page.mouse.down()
  await editor.page.keyboard.down('Control')
  await editor.page.mouse.move(box.x + 383, box.y + 140, { steps: 15 })
  expect(await selectedPosition()).toEqual({ x: 343, y: 100 })
  expect(await snapGuides()).toEqual([])
  await editor.page.keyboard.up('Control')
  await editor.page.mouse.up()
  editor.canvas.assertNoErrors()
})
