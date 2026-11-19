import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { openLayersPanel } from '#tests/helpers/properties'
import { getPageChildren } from '#tests/helpers/store'

const editor = useEditorSetupWithClear()

test.beforeEach(async () => {
  await openLayersPanel(editor.page)
})

async function renameLayer() {
  await editor.canvas.drawRect(200, 200, 100, 100)
  const row = editor.page.getByTestId('layers-item').last()
  await row.dblclick()
  const input = editor.page.getByTestId('layers-item-input')
  await expect(input).toBeFocused()
  return input
}

// A text field keeps the canvas's keys; only the application and file commands pass through.
test('⌘D in a rename field leaves the document alone', async () => {
  await renameLayer()
  const before = await getPageChildren(editor.page)

  await editor.page.keyboard.press('ControlOrMeta+KeyD')

  expect(await getPageChildren(editor.page)).toEqual(before)
  await expect(editor.page.getByTestId('layers-item-input')).toBeFocused()
})

test('⌘G in a rename field does not group the selection', async () => {
  await renameLayer()
  const before = await getPageChildren(editor.page)

  await editor.page.keyboard.press('ControlOrMeta+KeyG')

  expect(await getPageChildren(editor.page)).toEqual(before)
  await expect(editor.page.getByTestId('layers-item-input')).toBeFocused()
})

test('? in a rename field is a character, not the shortcut sheet', async () => {
  const input = await renameLayer()

  await editor.page.keyboard.press('Shift+Slash')

  await expect(editor.page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeHidden()
  await expect(input).toBeFocused()
  // The name opens selected, so the character replaces it.
  await expect(input).toHaveValue('?')
})
