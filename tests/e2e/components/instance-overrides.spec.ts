import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import {
  componentOf,
  createInstanceLayerScene,
  firstLayerId,
  layerSummary,
  selectedIds,
  selectNodes
} from '#tests/helpers/components/instances'
import { openAppMenu } from '#tests/helpers/menu'

const editor = useEditorSetup()

test.beforeAll(async () => {
  await editor.page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
})

test.beforeEach(async () => {
  await editor.canvas.clearCanvas()
})

async function copySelection() {
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
}

test('⌥⇧R replaces a layer inside an instance with the copied layer, and restores it', async () => {
  const { page } = editor
  const scene = await createInstanceLayerScene(page)
  await selectNodes(page, [scene.starId])
  await copySelection()

  await selectNodes(page, [await firstLayerId(page, scene.instanceId)])
  await page.keyboard.press('Alt+Shift+KeyR')
  await expect
    .poll(() => layerSummary(page, scene.instanceId))
    .toEqual(['STAR:Star', 'RECTANGLE:Label'])

  const panel = page.getByTestId('design-panel-single')
  await panel.getByRole('button', { name: 'Restore component layer' }).click()
  await expect
    .poll(() => layerSummary(page, scene.instanceId))
    .toEqual(['RECTANGLE:Icon', 'RECTANGLE:Label'])

  await page.keyboard.press('ControlOrMeta+z')
  await expect
    .poll(() => layerSummary(page, scene.instanceId))
    .toEqual(['STAR:Star', 'RECTANGLE:Label'])
})

test('the canvas menu offers Replace inside instance for a layer inside an instance', async () => {
  const { page } = editor
  const scene = await createInstanceLayerScene(page)
  await selectNodes(page, [scene.starId])
  await copySelection()
  const iconId = await firstLayerId(page, scene.instanceId)

  // Double-click enters the instance and selects the icon under the pointer, at (220, 220);
  // a right-click there keeps it selected.
  const box = await editor.canvas.canvas.boundingBox()
  if (!box) throw new Error('Expected the canvas')
  await page.mouse.dblclick(box.x + 220, box.y + 220)
  await expect.poll(() => selectedIds(page)).toEqual([iconId])
  await page.mouse.click(box.x + 220, box.y + 220, { button: 'right' })
  await page.getByTestId('context-replace-in-instance').click()
  await expect
    .poll(() => layerSummary(page, scene.instanceId))
    .toEqual(['STAR:Star', 'RECTANGLE:Label'])
})

test('the instance header swaps a nested instance to another component', async () => {
  const { page } = editor
  const scene = await createInstanceLayerScene(page)
  const nestedId = await firstLayerId(page, scene.cardInstanceId)
  await selectNodes(page, [nestedId])

  const panel = page.getByTestId('design-panel-single')
  await panel.getByRole('button', { name: 'Swap instance' }).click()
  await page.getByRole('option', { name: /Icon B/ }).click()
  await expect.poll(() => componentOf(page, nestedId)).toBe(scene.otherIconId)
  await expect.poll(() => layerSummary(page, nestedId)).toEqual(['ELLIPSE:Dot'])

  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(() => layerSummary(page, nestedId)).toEqual(['RECTANGLE:Square'])
})
