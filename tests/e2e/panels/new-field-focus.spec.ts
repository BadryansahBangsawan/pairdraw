import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

const editor = useEditorSetupWithClear()

function currentTool() {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.state.activeTool
  })
}

test('the notes a layer gains take the next keystrokes', async () => {
  await editor.canvas.drawRect(200, 200, 100, 100)
  const section = editor.page.getByTestId('agent-notes-section')
  await section.getByRole('button', { name: 'Add notes for AI' }).click()

  const context = section.getByRole('textbox').first()
  await expect(context).toBeFocused()
  const toolBefore = await currentTool()
  await editor.page.keyboard.type('Primary call to action')

  await expect(context).toHaveValue('Primary call to action')
  // Typing reaches the note rather than the canvas's tool keys.
  expect(await currentTool()).toBe(toolBefore)
})
