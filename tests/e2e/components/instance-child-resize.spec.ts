import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import {
  createInstanceLayerScene,
  firstLayerId,
  selectNodes
} from '#tests/helpers/components/instances'
import { openDesignPanel } from '#tests/helpers/properties'

const editor = useEditorSetup()

test.beforeEach(async () => {
  await editor.canvas.clearCanvas()
})

function sizeField(axis: 'width' | 'height') {
  return editor.page
    .getByRole('region', { name: 'Layout', exact: true })
    .getByRole('spinbutton', { name: axis === 'width' ? 'Width' : 'Height' })
}

function rectOf(id: string) {
  return editor.page.evaluate((nodeId) => {
    const node = window.pairdraw?.getStore?.().graph.getNode(nodeId)
    if (!node) throw new Error('No node')
    return { x: node.x, y: node.y, width: node.width, height: node.height }
  }, id)
}

test('a layer inside an instance keeps its component size', async () => {
  const { instanceId } = await createInstanceLayerScene(editor.page)
  await openDesignPanel(editor.page)
  const iconId = await firstLayerId(editor.page, instanceId)
  await selectNodes(editor.page, [iconId])

  await expect(sizeField('width')).toBeDisabled()
  await expect(sizeField('height')).toBeDisabled()

  const before = await rectOf(iconId)
  const corner = await editor.page.evaluate((nodeId) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const node = store.graph.getNode(nodeId)
    const at = store.graph.getAbsolutePosition(nodeId)
    if (!node) throw new Error('No node')
    return {
      x: at.x * store.state.zoom + store.state.panX + node.width * store.state.zoom,
      y: at.y * store.state.zoom + store.state.panY + node.height * store.state.zoom
    }
  }, iconId)
  const origin = await editor.canvas.pointerOrigin()
  await editor.page.mouse.move(origin.x + corner.x, origin.y + corner.y)
  await editor.page.mouse.down()
  await editor.page.mouse.move(origin.x + corner.x + 60, origin.y + corner.y + 60, { steps: 8 })
  await editor.page.mouse.up()

  // Without handles the drag moves the layer instead; its size stays the component's.
  const after = await rectOf(iconId)
  expect({ width: after.width, height: after.height }).toEqual({
    width: before.width,
    height: before.height
  })
  editor.canvas.assertNoErrors()
})

test('the size fields a multi-selection shows are disabled for an instance layer', async () => {
  const { instanceId, starId } = await createInstanceLayerScene(editor.page)
  await openDesignPanel(editor.page)
  const iconId = await firstLayerId(editor.page, instanceId)
  await selectNodes(editor.page, [iconId, starId])

  const section = editor.page.getByTestId('selection-layout')
  await expect(section.locator('[data-property="width"]')).toHaveAttribute('aria-disabled', 'true')
  await expect(section.locator('[data-property="height"]')).toHaveAttribute('aria-disabled', 'true')
  editor.canvas.assertNoErrors()
})

test('a nested instance keeps a size of its own', async () => {
  const { cardInstanceId } = await createInstanceLayerScene(editor.page)
  await openDesignPanel(editor.page)
  const nestedId = await firstLayerId(editor.page, cardInstanceId)
  await selectNodes(editor.page, [nestedId])

  const input = sizeField('width')
  await expect(input).toBeEnabled()
  await input.click()
  await editor.page.keyboard.press('ControlOrMeta+a')
  await editor.page.keyboard.type('48')
  await editor.page.keyboard.press('Enter')
  await expect.poll(async () => (await rectOf(nestedId)).width).toBe(48)
  editor.canvas.assertNoErrors()
})
