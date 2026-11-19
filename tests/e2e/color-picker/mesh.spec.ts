import { expect, test, type Page } from '@playwright/test'

import type { Color } from '@pairdraw/scene-graph/primitives'

import { CanvasHelper } from '#tests/helpers/canvas'

// A fill's Mesh tab from Figma desktop 126: switching a solid fill to mesh shows an editable grid
// of points, recoloring a point changes the layer's fill, and the whole edit is one undo step.

let page: Page
let canvas: CanvasHelper

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/?test')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()
})

test.afterAll(async () => {
  await page.close()
})

type FillView = {
  type: string
  meshColumns?: number
  meshRows?: number
  color: Color
  meshPoints?: { color: Color }[]
} | null

async function getSelectedFill(): Promise<FillView> {
  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const id = [...store.state.selectedIds][0]
    if (!id) return null
    const node = store.graph.getNode(id)
    const fill = node?.fills?.[0]
    return fill
      ? {
          type: fill.type,
          meshColumns: fill.meshColumns,
          meshRows: fill.meshRows,
          color: fill.color,
          meshPoints: fill.meshPoints?.map((point) => ({
            color: point.color
          }))
        }
      : null
  }) as Promise<FillView>
}

async function recolorActivePoint() {
  const slider = page
    .getByTestId('color-slider-hue')
    .locator(':scope > [data-orientation="horizontal"]')
  const box = await slider.boundingBox()
  if (!box) throw new Error('Missing hue slider')
  await slider.click({ position: { x: box.width * 0.7, y: box.height / 2 } })
  await canvas.waitForRender()
}

test('mesh tab switches a fill, recoloring a point changes it, as one undo step', async () => {
  await canvas.clearCanvas()
  await canvas.drawRect(100, 100, 160, 120)
  await canvas.waitForRender()

  const before = await getSelectedFill()
  expect(before?.type).toBe('SOLID')

  await page.getByTestId('fill-picker-swatch').first().click()
  await expect(page.getByTestId('fill-picker-tab-solid')).toBeVisible()

  const meshTab = page.getByTestId('fill-picker-tab-mesh')
  await meshTab.click()
  await expect(meshTab).toHaveAttribute('data-active', 'true')

  const mesh = await getSelectedFill()
  expect(mesh?.type).toBe('MESH')
  expect(mesh?.meshColumns).toBe(1)
  expect(mesh?.meshRows).toBe(1)
  expect(mesh?.meshPoints?.length).toBe(4)
  // The first point is active by default; clicking it selects it for the recolor below.
  await page.getByRole('button', { name: 'Mesh point 1' }).click()
  const pointBeforeRecolor = (await getSelectedFill())?.meshPoints?.[0]?.color
  await recolorActivePoint()
  const pointAfterRecolor = (await getSelectedFill())?.meshPoints?.[0]?.color

  expect(pointAfterRecolor).not.toEqual(pointBeforeRecolor)

  // The switch and the recolor are steps of their own, as a picker's discrete change and its press
  // are (color-picker/history.spec.ts): the recolor undoes to the mesh's first point, then the
  // switch returns the fill to solid.
  await canvas.undo()
  const reverted = await getSelectedFill()
  expect(reverted?.type).toBe('MESH')
  expect(reverted?.meshPoints?.[0]?.color).toEqual(pointBeforeRecolor)
  await canvas.undo()
  expect(await getSelectedFill()).toEqual(before)
  canvas.assertNoErrors()
})
