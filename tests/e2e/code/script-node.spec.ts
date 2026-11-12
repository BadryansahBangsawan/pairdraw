import { expect, test, useFreshEditor } from '#tests/e2e/fixtures'
import { openAppMenu } from '#tests/helpers/menu'

const editor = useFreshEditor()

/** Types of the selected script layer's children, as the canvas graph holds them. */
function scriptOutputTypes(): Promise<string[]> {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const node = store.graph.getNode([...store.state.selectedIds][0] ?? '')
    if (!node) return []
    return node.childIds.map((id) => store.graph.getNode(id)?.type ?? 'MISSING')
  })
}

/** Names of the selected script layer's children. */
function scriptChildNames(): Promise<string[]> {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const node = store.graph.getNode([...store.state.selectedIds][0] ?? '')
    if (!node) return []
    return node.childIds.map((id) => store.graph.getNode(id)?.name ?? 'MISSING')
  })
}

/** The Design panel section a script layer owns, found by its label. */
function scriptSection() {
  return editor.page.getByRole('region', { name: 'Script layer', exact: true })
}

test('Insert Script places a script layer whose starter program draws and runs again', async () => {
  const object = await openAppMenu(editor.page, 'Object')
  await object.getByRole('menuitem', { name: 'Insert Script…' }).click()

  const section = scriptSection()
  await expect(section).toBeVisible()
  const source = section.getByTestId('script-source')
  await expect(source).toHaveValue(/pencil\.frame/)
  await expect(editor.page.getByTestId('script-error')).toHaveCount(0)

  // The starter run draws through the sandbox iframe, so its layers arrive after insert.
  await expect.poll(() => scriptOutputTypes()).toEqual(['FRAME'])
})

test('a failing script shows its error in the panel and on the layer', async () => {
  const object = await openAppMenu(editor.page, 'Object')
  await object.getByRole('menuitem', { name: 'Insert Script…' }).click()

  const section = scriptSection()
  await section.getByTestId('script-source').fill('throw new Error("boom")')
  await section.getByTestId('script-source').blur()

  const error = editor.page.getByTestId('script-error')
  await expect(error).toContainText('boom')

  await expect.poll(() => scriptChildNames()).toEqual(['Script error'])
})
