import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { expectDefined } from '#tests/helpers/assert'

const editor = useEditorSetup()

test.beforeAll(async () => {
  await editor.page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
})

function clipboardText() {
  return editor.page.evaluate(() => navigator.clipboard.readText())
}

async function openCopyAs(x: number, y: number) {
  const box = expectDefined(await editor.canvas.canvas.boundingBox(), 'canvas bounds')
  await editor.page.mouse.click(box.x + x, box.y + y, { button: 'right' })
  await editor.page.getByTestId('context-copy-paste-as').click({ force: true })
}

test('Copy as HTML writes the selected layer as an HTML fragment', async () => {
  await editor.canvas.clearCanvas()
  await editor.canvas.drawRect(200, 200, 120, 80)
  await editor.canvas.waitForRender()
  await editor.page.evaluate(() => navigator.clipboard.writeText(''))

  await openCopyAs(250, 230)
  const item = editor.page.getByTestId('context-copy-as-html')
  await expect(item).toHaveText('Copy as HTML')
  await item.click()

  await expect.poll(clipboardText).toContain('<div')
  const html = await clipboardText()
  // A fragment with inline styles, ready to paste into a page.
  expect(html).not.toContain('<html')
  expect(html).not.toContain('<style')
  expect(html).toContain('style="')
})

test('Copy properties keeps its shortcut, and Copy as HTML takes none', async () => {
  await openCopyAs(250, 230)
  // The item's text is its label alone, with no shortcut beside it.
  await expect(editor.page.getByTestId('context-copy-as-html')).toHaveText('Copy as HTML')
  await expect(editor.page.getByTestId('context-copy-properties')).not.toHaveText('Copy properties')
  await editor.page.keyboard.press('Escape')
})
