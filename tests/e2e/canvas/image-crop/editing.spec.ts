import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { expectDefined } from '#tests/helpers/assert'
import { imageCropDriver } from '#tests/helpers/canvas/image-crop/driver'
import { propertyItems } from '#tests/helpers/properties'

// Image edit mode, as Figma's Crop image: the layer's edges crop over a still image, and the image
// moves and scales behind a still layer. Each drag is one undo step; Enter, Escape, a double-click,
// or a press outside the image leaves the mode.

const editor = useEditorSetupWithClear('/?test&no-rulers')

const crop = imageCropDriver(() => editor.page)

async function enterByDoubleClick(nodeId: string) {
  const inside = crop.point(100, 50)
  await editor.canvas.dblclick(inside.x, inside.y)
  await expect.poll(() => crop.editing()).toBe(nodeId)
}

test('a double-click opens the image without changing it, and Escape leaves', async () => {
  const nodeId = await crop.show()
  await editor.canvas.waitForRender()
  await enterByDoubleClick(nodeId)
  expect(await crop.canUndo()).toBe(false)

  await editor.page.keyboard.press('Escape')
  await expect.poll(() => crop.editing()).toBeNull()
  // Escape leaves the mode before it clears the selection.
  expect(
    await editor.page.evaluate(() => window.openPencil?.getStore?.().state.selectedIds.size)
  ).toBe(1)
  expect(await crop.layer(nodeId)).toMatchObject({ mode: 'FILL', width: 200, height: 100 })
  editor.canvas.assertNoErrors()
})

test('dragging a crop edge narrows the layer over the image as one undo step', async () => {
  const nodeId = await crop.show()
  await editor.canvas.waitForRender()
  await enterByDoubleClick(nodeId)
  const edge = crop.point(200, 50)
  const target = crop.point(150, 50)
  await editor.canvas.drag(edge.x, edge.y, target.x, target.y)
  await editor.canvas.waitForRender()

  const layer = expectDefined(await crop.layer(nodeId), 'cropped layer')
  expect(layer.x).toBeCloseTo(0, 0)
  expect(layer.width).toBeCloseTo(150, 0)
  expect(layer.height).toBeCloseTo(100, 0)
  expect(layer.mode).toBe('CROP')
  // The image stays 200 layer pixels wide, so the narrower layer shows three quarters of it.
  expect(layer.transform?.m00).toBeCloseTo(0.75, 2)
  expect(await crop.editing()).toBe(nodeId)

  await editor.page.keyboard.press('Enter')
  await expect.poll(() => crop.editing()).toBeNull()
  await editor.canvas.undo()
  expect(await crop.layer(nodeId)).toMatchObject({ mode: 'FILL', width: 200, height: 100 })
})

test('dragging the image reframes it behind the layer', async () => {
  const nodeId = await crop.show()
  await editor.canvas.waitForRender()
  await enterByDoubleClick(nodeId)
  const from = crop.point(100, 50)
  const to = crop.point(100, 60)
  await editor.canvas.drag(from.x, from.y, to.x, to.y)
  await editor.canvas.waitForRender()

  const layer = expectDefined(await crop.layer(nodeId), 'reframed layer')
  expect(layer).toMatchObject({ x: 0, y: 0, width: 200, height: 100, mode: 'CROP' })
  // The image moved 10 of its 25 spare pixels down: its window starts a tenth of the way in.
  expect(layer.transform?.m12).toBeCloseTo(0.1, 2)
  editor.canvas.assertNoErrors()
})

test('dragging an image corner scales the image and keeps its proportions', async () => {
  const nodeId = await crop.show()
  await editor.canvas.waitForRender()
  await enterByDoubleClick(nodeId)
  // The image's bottom-right corner, 25 layer pixels below the layer, pulled out by a quarter.
  const corner = crop.point(200, 125)
  const target = crop.point(250, 162.5)
  await editor.canvas.drag(corner.x, corner.y, target.x, target.y)
  await editor.canvas.waitForRender()

  const layer = expectDefined(await crop.layer(nodeId), 'scaled layer')
  expect(layer).toMatchObject({ width: 200, height: 100, mode: 'CROP' })
  expect(layer.transform?.m00).toBeCloseTo(0.8, 2)
  expect(layer.transform?.m11).toBeCloseTo(100 / 187.5, 2)
})

test('Escape during a drag puts the layer back and keeps the mode', async () => {
  const nodeId = await crop.show()
  await editor.canvas.waitForRender()
  await enterByDoubleClick(nodeId)
  const before = await crop.layer(nodeId)
  const edge = crop.point(200, 50)
  const origin = await editor.canvas.pointerOrigin()
  await editor.page.mouse.move(origin.x + edge.x, origin.y + edge.y)
  await editor.page.mouse.down()
  await editor.page.mouse.move(origin.x + edge.x - 80, origin.y + edge.y, { steps: 5 })
  expect(await crop.layer(nodeId)).not.toEqual(before)

  await editor.page.keyboard.press('Escape')
  await editor.page.mouse.up()
  await editor.canvas.waitForRender()
  expect(await crop.layer(nodeId)).toEqual(before)
  expect(await crop.editing()).toBe(nodeId)
})

test('a press outside the image leaves the mode', async () => {
  const nodeId = await crop.show()
  await editor.canvas.waitForRender()
  await enterByDoubleClick(nodeId)
  const outside = crop.point(260, 140)
  await editor.canvas.click(outside.x, outside.y)
  await expect.poll(() => crop.editing()).toBeNull()
})

test('Enter opens a selected image and Enter leaves it', async () => {
  const nodeId = await crop.show()
  await editor.canvas.waitForRender()
  const inside = crop.point(100, 50)
  await editor.canvas.click(inside.x, inside.y)
  await editor.page.keyboard.press('Enter')
  await expect.poll(() => crop.editing()).toBe(nodeId)
  await editor.page.keyboard.press('Enter')
  await expect.poll(() => crop.editing()).toBeNull()
})

test('the context menu offers Crop image for a layer showing an image', async () => {
  const nodeId = await crop.show()
  await editor.canvas.waitForRender()
  const inside = crop.point(100, 50)
  const origin = await editor.canvas.pointerOrigin()
  await editor.page.mouse.click(origin.x + inside.x, origin.y + inside.y, { button: 'right' })
  await editor.page.getByTestId('context-crop-image').click()
  await expect.poll(() => crop.editing()).toBe(nodeId)
})

test('the image fill picker crops on the canvas, where a Fit image becomes a crop', async () => {
  const nodeId = await crop.show('FIT')
  await editor.canvas.waitForRender()
  await propertyItems(editor.page, 'fills')
    .first()
    .getByRole('button', { name: 'Fill', exact: true })
    .click()
  await editor.page.getByRole('button', { name: 'Crop image' }).click()
  await expect.poll(() => crop.editing()).toBe(nodeId)
  expect((await crop.layer(nodeId))?.mode).toBe('CROP')
  // Turning Fit into a crop is one undo step.
  expect(await crop.canUndo()).toBe(true)
})
