import { statSync } from 'node:fs'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

// WebKit has no File System Access API, so a save asks for a name and downloads the file, which a
// spec can answer; that is why this runs in the WebKit project rather than in Chromium's.
const editor = useEditorSetup()

/** Answers the save prompt and waits for the file it downloads. */
async function saveWith(name: string): Promise<{ suggested: string; size: number }> {
  const page = editor.page
  page.once('dialog', (dialog) => void dialog.accept(name))
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.keyboard.press('Meta+s')
  ])
  const path = await download.path()
  return {
    suggested: download.suggestedFilename(),
    size: path ? statSync(path).size : 0
  }
}

test('⌘S saves while a layer name field is being typed in', async () => {
  await editor.canvas.clearCanvas()
  await editor.canvas.drawRect(120, 120, 80, 60)
  // The rename field is the layer row's, drawn while the Layers view shows.
  await editor.page.getByTestId('left-panel-layers-tab').click()
  await editor.page.keyboard.press('Meta+r')
  const field = editor.page.locator('[data-slot="rename-input"]').first()
  await field.waitFor({ state: 'visible', timeout: 5000 })
  await field.fill('Renamed layer')

  const saved = await saveWith('qa-renamed.fig')
  expect(saved.suggested).toBe('qa-renamed.fig')
  expect(saved.size).toBeGreaterThan(0)

  // The field committed before the file was written.
  const name = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    const id = store ? [...store.state.selectedIds][0] : undefined
    return id ? store?.graph.getNode(id)?.name : undefined
  })
  expect(name).toBe('Renamed layer')
  editor.canvas.assertNoErrors()
})

test('⌘S saves while text is edited on the canvas and the edit keeps its focus', async () => {
  await editor.canvas.clearCanvas()
  await editor.page.keyboard.press('t')
  await editor.canvas.click(160, 160)
  await editor.page.keyboard.type('Hi')

  const saved = await saveWith('qa-typing.fig')
  expect(saved.size).toBeGreaterThan(0)

  const state = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    const pageId = store?.state.currentPageId
    const node = pageId ? store?.graph.getChildren(pageId)[0] : undefined
    return { text: node?.text, editing: store?.state.editingTextId === node?.id }
  })
  expect(state).toEqual({ text: 'Hi', editing: true })
  editor.canvas.assertNoErrors()
})
