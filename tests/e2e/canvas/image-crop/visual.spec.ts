import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { imageCropDriver } from '#tests/helpers/canvas/image-crop/driver'

// Image edit mode draws the whole image, faded outside the layer, with dots on its corners, and
// the layer's outline with crop brackets and edge bars, in place of the selection.

const editor = useEditorSetupWithClear('/?test&no-chrome&no-rulers')

const crop = imageCropDriver(() => editor.page)

test('image crop handles', async () => {
  const nodeId = await crop.show()
  await crop.edit(nodeId)
  await editor.canvas.waitForRender()
  expect(await editor.canvas.screenshotCanvasRegion(700, 560)).toMatchSnapshot('image-crop.png')
  editor.canvas.assertNoErrors()
})

test('image crop handles on a cropped and reframed image', async () => {
  const nodeId = await crop.show()
  await crop.edit(nodeId)
  await editor.canvas.waitForRender()
  const edge = crop.point(200, 50)
  const target = crop.point(150, 50)
  await editor.canvas.drag(edge.x, edge.y, target.x, target.y)
  const from = crop.point(75, 50)
  const to = crop.point(75, 65)
  await editor.canvas.drag(from.x, from.y, to.x, to.y)
  await editor.canvas.waitForRender()
  expect(await editor.canvas.screenshotCanvasRegion(700, 560)).toMatchSnapshot(
    'image-crop-reframed.png'
  )
  editor.canvas.assertNoErrors()
})
