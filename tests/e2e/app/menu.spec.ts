import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import { openAppMenu } from '#tests/helpers/menu'

const editor = useEditorSetup()

test('the brand opens the app menus in browser mode', async () => {
  await expect(editor.page.getByTestId('app-main-menu')).toBeVisible()
  await expect(editor.page.getByTestId('app-main-menu')).toHaveAttribute('aria-haspopup', 'menu')
})

test('the brand menu holds every top-level menu', async () => {
  await expect(editor.page.getByRole('menu')).toHaveCount(0)
  await editor.page.getByTestId('app-main-menu').click()
  const menu = editor.page.getByRole('menu')
  await expect(menu).toBeVisible()
  const labels = await menu.locator('[role="menuitem"]').allTextContents()
  expect(labels.map((label) => label.trim())).toEqual([
    'File',
    'Edit',
    'View',
    'Object',
    'Text',
    'Arrange'
  ])
  await editor.page.keyboard.press('Escape')
})

test('File menu opens and shows items', async () => {
  const menu = await openAppMenu(editor.page, 'File')

  const items = await menu.locator('[role="menuitem"]').allTextContents()
  expect(items.some((t) => t.includes('Open'))).toBe(true)
  expect(items.some((t) => t.includes('Save'))).toBe(true)
  expect(items.some((t) => t.includes('Save as'))).toBe(true)

  await editor.page.keyboard.press('Escape')
})

test('Edit menu shows Undo/Redo/Delete', async () => {
  const menu = await openAppMenu(editor.page, 'Edit')

  const items = await menu.locator('[role="menuitem"]').allTextContents()
  expect(items.some((t) => t.includes('Undo'))).toBe(true)
  expect(items.some((t) => t.includes('Redo'))).toBe(true)
  expect(items.some((t) => t.includes('Delete'))).toBe(true)
  expect(items.some((t) => t.includes('Select all'))).toBe(true)

  await editor.page.keyboard.press('Escape')
})

test('View menu shows zoom options', async () => {
  const menu = await openAppMenu(editor.page, 'View')

  const items = await menu.locator('[role="menuitem"]').allTextContents()
  expect(items.some((t) => t.includes('Zoom to fit'))).toBe(true)
  expect(items.some((t) => t.includes('Zoom in'))).toBe(true)
  expect(items.some((t) => t.includes('Zoom out'))).toBe(true)
  expect(items.some((t) => t.includes('Zoom tool'))).toBe(true)

  await editor.page.keyboard.press('Escape')
})

test('Shader Mode and Add Link wait for a selection that has them', async () => {
  await openAppMenu(editor.page, 'View')
  await expect(editor.page.getByRole('menuitem', { name: 'Shader Mode' })).toHaveAttribute(
    'data-disabled'
  )
  await editor.page.keyboard.press('Escape')

  await openAppMenu(editor.page, 'Text')
  await expect(editor.page.getByRole('menuitem', { name: 'Add link' })).toHaveAttribute(
    'data-disabled'
  )
  await editor.page.keyboard.press('Escape')

  await editor.canvas.drawRect(200, 200, 100, 100)
  await openAppMenu(editor.page, 'View')
  // A plain rectangle has no shader fill, so Shader Mode stays out of reach.
  await expect(editor.page.getByRole('menuitem', { name: 'Shader Mode' })).toHaveAttribute(
    'data-disabled'
  )
  await editor.page.keyboard.press('Escape')

  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    for (const id of store.state.selectedIds) store.graph.deleteNode(id)
    store.clearSelection()
    store.undo.clear()
  })
})

test('Bold, Italic and Underline wait for a selected text', async () => {
  const formats = ['Bold', 'Italic', 'Underline']
  async function expectFormats(disabled: boolean) {
    await openAppMenu(editor.page, 'Text')
    for (const name of formats) {
      const item = editor.page.getByRole('menuitem', { name })
      if (disabled) await expect(item).toHaveAttribute('data-disabled')
      else await expect(item).not.toHaveAttribute('data-disabled')
    }
    await editor.page.keyboard.press('Escape')
  }

  await expectFormats(true)

  // A rectangle has no text to format.
  await editor.canvas.drawRect(200, 200, 100, 100)
  await expectFormats(true)

  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const text = store.graph.createNode('TEXT', store.state.currentPageId, {
      name: 'Label',
      text: 'Label',
      x: 400,
      y: 200,
      width: 80,
      height: 20
    })
    store.select([text.id])
  })
  await expectFormats(false)

  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const page = store.graph.getNode(store.state.currentPageId)
    // A copy, since each deletion takes the layer out of the page's own list.
    for (const id of page?.childIds.slice() ?? []) store.graph.deleteNode(id)
    store.clearSelection()
    store.undo.clear()
  })
})

test('the Zoom tool is picked from the View menu', async () => {
  await openAppMenu(editor.page, 'View')
  await editor.page.getByRole('menuitem', { name: 'Zoom tool' }).click()

  const tool = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.state.activeTool
  })
  expect(tool).toBe('ZOOM')

  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.setTool('SELECT')
  })
})

test('Shader Mode opens from the View menu on a shader fill', async () => {
  await editor.canvas.drawRect(200, 200, 160, 80)
  // Choosing the shader tab turns the fill into the default shader.
  await editor.page.getByTestId('fill-picker-swatch').first().click()
  await editor.page.getByTestId('fill-picker-tab-shader').click()
  await editor.page.keyboard.press('Escape')

  await openAppMenu(editor.page, 'View')
  const shaderMode = editor.page.getByRole('menuitem', { name: 'Shader Mode' })
  await expect(shaderMode).not.toHaveAttribute('data-disabled')
  await shaderMode.click()

  await expect(editor.page.getByTestId('shader-mode')).toBeVisible()

  await editor.page.keyboard.press('Escape')
  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    for (const id of store.state.selectedIds) store.graph.deleteNode(id)
    store.clearSelection()
    store.undo.clear()
  })
})

test('Object menu shows Group/Ungroup/Component', async () => {
  const menu = await openAppMenu(editor.page, 'Object')

  const items = await menu.locator('[role="menuitem"]').allTextContents()
  expect(items.some((t) => t.includes('Group'))).toBe(true)
  expect(items.some((t) => t.includes('Ungroup'))).toBe(true)
  expect(items.some((t) => t.includes('Create component'))).toBe(true)
  expect(items.some((t) => t.includes('Bring to front'))).toBe(true)
  expect(items.some((t) => t.includes('Send to back'))).toBe(true)

  await editor.page.keyboard.press('Escape')
})

function getStoreStateNumber(key: 'selectedIds' | 'zoom') {
  return editor.page.evaluate((stateKey) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    if (stateKey === 'selectedIds') return store.state.selectedIds.size
    return store.state.zoom
  }, key)
}

test('Move to page is disabled without a selection', async () => {
  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.addPage('Second page')
    store.switchPage(store.graph.getPages()[0].id)
  })

  await openAppMenu(editor.page, 'Object')
  const moveToPage = editor.page.getByRole('menuitem', { name: 'Move to page' })
  await expect(moveToPage).toHaveAttribute('data-disabled')
  await editor.page.keyboard.press('Escape')

  await editor.canvas.drawRect(200, 200, 100, 100)
  await openAppMenu(editor.page, 'Object')
  await expect(editor.page.getByRole('menuitem', { name: 'Move to page' })).not.toHaveAttribute(
    'data-disabled'
  )
  await editor.page.keyboard.press('Escape')
  // A menu still closing takes the next press, so the following test's drag would draw nothing.
  await expect(editor.page.getByRole('menu')).toHaveCount(0)
  await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    for (const id of store.state.selectedIds) store.graph.deleteNode(id)
    store.clearSelection()
    store.undo.clear()
  })
})

test('Undo via Edit menu works', async () => {
  await editor.canvas.drawRect(200, 200, 100, 100)
  const beforeUndo = await getStoreStateNumber('selectedIds')
  expect(beforeUndo).toBe(1)

  await openAppMenu(editor.page, 'Edit')
  const undoItem = editor.page.getByRole('menuitem', { name: /^Undo\b/ })
  await expect(undoItem).toBeEnabled()
  await undoItem.click()
  await editor.canvas.waitForRender()

  const afterUndo = await getStoreStateNumber('selectedIds')
  expect(afterUndo).toBe(0)

  await openAppMenu(editor.page, 'Edit')
  await expect(editor.page.getByRole('menuitem', { name: /^Redo\b/ })).toBeEnabled()
  await editor.page.keyboard.press('Escape')
})

test('Duplicate via Edit menu works', async () => {
  await editor.canvas.drawRect(300, 300, 80, 80)

  const countBefore = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.graph.getChildren(store.state.currentPageId).length
  })

  const editMenu = await openAppMenu(editor.page, 'Edit')
  await editMenu.locator('[role="menuitem"]', { hasText: 'Duplicate' }).click()
  await editor.canvas.waitForRender()

  const countAfter = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return store.graph.getChildren(store.state.currentPageId).length
  })

  expect(countAfter).toBe(countBefore + 1)
})

test('Zoom to fit via View menu works', async () => {
  const zoomInMenu = await openAppMenu(editor.page, 'View')
  await zoomInMenu.locator('[role="menuitem"]', { hasText: 'Zoom in' }).click()
  await editor.canvas.waitForRender()

  const zoomBefore = await getStoreStateNumber('zoom')
  expect(zoomBefore).toBeGreaterThan(1)

  const zoomToFitMenu = await openAppMenu(editor.page, 'View')
  await zoomToFitMenu.locator('[role="menuitem"]', { hasText: 'Zoom to fit' }).click()
  await editor.canvas.waitForRender()

  const zoomAfter = await getStoreStateNumber('zoom')
  expect(zoomAfter).not.toBe(zoomBefore)
})
