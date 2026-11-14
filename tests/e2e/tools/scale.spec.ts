import type { Page } from '@playwright/test'

import type { Vector } from '@pairdraw/scene-graph/primitives'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { toolbarFlyoutItemTestId, toolbarFlyoutTestId } from '#tests/helpers/test-ids'

const editor = useEditorSetupWithClear('/?test&no-rulers')

interface Placed {
  id: string
  x: number
  y: number
  width: number
  height: number
  stroke: number
}

/** Places rectangles with a 2px stroke at 100% zoom with no pan, and selects them. */
async function place(page: Page, rects: Vector[]) {
  return page.evaluate((list) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.state.panX = 0
    store.state.panY = 0
    store.state.zoom = 1
    const ids = list.map(
      ({ x, y }) =>
        store.graph.createNode('RECTANGLE', store.state.currentPageId, {
          x,
          y,
          width: 100,
          height: 50,
          strokes: [
            {
              type: 'SOLID',
              color: { r: 0, g: 0, b: 0, a: 1 },
              weight: 2,
              opacity: 1,
              visible: true,
              align: 'CENTER'
            }
          ]
        }).id
    )
    store.select(ids)
    store.requestRender()
    return ids
  }, rects)
}

async function layers(page: Page, ids: string[]): Promise<Placed[]> {
  return page.evaluate((list) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return list.map((id) => {
      const node = store.graph.getNode(id)
      if (!node) throw new Error(`missing ${id}`)
      const { x, y, width, height } = node
      return { id, x, y, width, height, stroke: node.strokes[0]?.weight ?? 0 }
    })
  }, ids)
}

async function activeTool(page: Page) {
  return page.evaluate(() => window.pairdraw?.getStore?.().state.activeTool)
}

test('K picks the Scale tool, also offered in the Move flyout', async () => {
  await editor.canvas.pressKey('k')
  expect(await activeTool(editor.page)).toBe('SCALE')
  await editor.canvas.pressKey('v')
  await editor.page.getByTestId(toolbarFlyoutTestId('SELECT')).click()
  await editor.page.getByTestId(toolbarFlyoutItemTestId('SCALE')).click()
  expect(await activeTool(editor.page)).toBe('SCALE')
  await editor.canvas.pressKey('v')
})

test('dragging a corner scales the layer with its stroke, and one undo puts it back', async () => {
  const [id] = await place(editor.page, [{ x: 100, y: 100 }])
  await editor.canvas.pressKey('k')
  await editor.canvas.waitForRender()

  await editor.canvas.drag(200, 150, 300, 150)
  await editor.canvas.waitForRender()

  expect(await layers(editor.page, [id])).toEqual([
    { id, x: 100, y: 100, width: 200, height: 100, stroke: 4 }
  ])
  await editor.canvas.undo()
  expect(await layers(editor.page, [id])).toEqual([
    { id, x: 100, y: 100, width: 100, height: 50, stroke: 2 }
  ])
  await editor.canvas.pressKey('v')
})

test('dragging the top-left corner scales the layer from its bottom-right corner', async () => {
  const [id] = await place(editor.page, [{ x: 200, y: 200 }])
  await editor.canvas.pressKey('k')
  await editor.canvas.waitForRender()

  await editor.canvas.drag(200, 200, 100, 150)
  await editor.canvas.waitForRender()

  expect(await layers(editor.page, [id])).toEqual([
    { id, x: 100, y: 150, width: 200, height: 100, stroke: 4 }
  ])
  await editor.canvas.pressKey('v')
})

test('a multi-layer selection scales around its joint box', async () => {
  const ids = await place(editor.page, [
    { x: 100, y: 100 },
    { x: 300, y: 200 }
  ])
  await editor.canvas.pressKey('k')
  await editor.canvas.waitForRender()

  // The joint box runs 100..400 by 100..250; its bottom-right handle drags in to halve it.
  await editor.canvas.drag(400, 250, 250, 175)
  await editor.canvas.waitForRender()

  expect(await layers(editor.page, ids)).toEqual([
    { id: ids[0], x: 100, y: 100, width: 50, height: 25, stroke: 1 },
    { id: ids[1], x: 200, y: 150, width: 50, height: 25, stroke: 1 }
  ])
  await editor.canvas.pressKey('v')
})

test('the Scale panel scales by a typed factor from the picked anchor', async () => {
  const [id] = await place(editor.page, [{ x: 100, y: 100 }])
  await editor.canvas.pressKey('k')
  const panel = editor.page.getByTestId('design-panel-scale')
  await expect(panel).toBeVisible()

  await panel.getByTestId('scale-anchor-center').click()
  const factor = panel.getByTestId('scale-factor')
  await factor.click()
  const input = factor.getByRole('spinbutton')
  await input.fill('200%')
  await input.press('Enter')
  await editor.canvas.waitForRender()

  expect(await layers(editor.page, [id])).toEqual([
    { id, x: 50, y: 75, width: 200, height: 100, stroke: 4 }
  ])
  editor.canvas.assertNoErrors()
  await editor.canvas.pressKey('v')
})

test('typing a width scales the selection to it, height and all', async () => {
  const [id] = await place(editor.page, [{ x: 100, y: 100 }])
  await editor.canvas.pressKey('k')
  const panel = editor.page.getByTestId('design-panel-scale')
  await panel.getByTestId('scale-anchor-top-left').click()
  const width = panel.getByTestId('scale-width')
  await width.click()
  const input = width.getByRole('spinbutton')
  await input.fill('300')
  await input.press('Enter')
  await editor.canvas.waitForRender()

  expect(await layers(editor.page, [id])).toEqual([
    { id, x: 100, y: 100, width: 300, height: 150, stroke: 6 }
  ])
  await editor.canvas.pressKey('v')
})
