import type * as AppTabs from '@/app/tabs'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'

const editor = useEditorSetup()

test.beforeAll(async () => {
  await editor.page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
})

/**
 * A rectangle bound to `Spacing/Radius` in a new document, copied with ⌘C, then a second
 * document that already has a `Spacing` collection with its own `Radius`.
 */
async function copyIntoSecondDocument() {
  await editor.page.evaluate(async () => {
    const tabsURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(tabsURL)
    const source = tabs.createTab().store
    const spacing = source.graph.createCollection('Spacing')
    const radius = source.graph.createVariable('Radius', 'FLOAT', spacing.id, 12)
    const rect = source.graph.createNode('RECTANGLE', source.state.currentPageId, {
      name: 'Bound card',
      x: 100,
      y: 100,
      width: 120,
      height: 80,
      cornerRadius: 12,
      boundVariables: { cornerRadius: radius.id }
    })
    source.select([rect.id])
  })
  await editor.canvas.waitForRender()
  await editor.page.keyboard.press('ControlOrMeta+KeyC')

  await editor.page.evaluate(async () => {
    const tabsURL = '/src/app/tabs/index.ts'
    const tabs: typeof AppTabs = await import(tabsURL)
    const target = tabs.createTab().store
    const spacing = target.graph.createCollection('Spacing')
    target.graph.createVariable('Radius', 'FLOAT', spacing.id, 4)
  })
  await editor.canvas.waitForRender()
}

function pasted() {
  return editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const layers = store.graph.getChildren(store.state.currentPageId)
    const [id] = store.state.selectedIds
    const node = id ? store.graph.getNode(id) : undefined
    const variableId = node?.boundVariables.cornerRadius
    const variable = variableId ? store.graph.variables.get(variableId) : undefined
    return {
      layers: layers.length,
      collections: [...store.graph.variableCollections.values()].map(({ name }) => name),
      boundTo: variable
        ? `${store.graph.variableCollections.get(variable.collectionId)?.name}/${variable.name}`
        : null,
      cornerRadius: node?.cornerRadius
    }
  })
}

test('pasting from another document asks before importing, and Use existing reuses its variables', async () => {
  await copyIntoSecondDocument()
  await editor.page.keyboard.press('ControlOrMeta+KeyV')

  const dialog = editor.page.getByTestId('clipboard-import-dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByTestId('clipboard-import-conflict')).toHaveCount(1)
  expect((await pasted()).layers).toBe(0)

  await expect(dialog.getByTestId('clipboard-import-confirm')).toBeFocused()
  await editor.page.keyboard.press('Enter')
  await expect(dialog).toBeHidden()
  await expect.poll(pasted).toMatchObject({
    layers: 1,
    collections: ['Spacing'],
    boundTo: 'Spacing/Radius',
    // The existing variable decides the radius, not the copied value.
    cornerRadius: 4
  })
})

test('Add renamed imports the copied collection under a new name', async () => {
  await editor.page.keyboard.press('ControlOrMeta+KeyV')
  const dialog = editor.page.getByTestId('clipboard-import-dialog')
  await expect(dialog).toBeVisible()
  await dialog
    .getByTestId('clipboard-import-conflict')
    .getByRole('button', { name: 'Add renamed' })
    .click()
  await dialog.getByTestId('clipboard-import-confirm').click()
  // Shortcuts reach the editor again once the dialog has closed and handed focus back.
  await expect(dialog).toBeHidden()

  await expect.poll(pasted).toMatchObject({
    layers: 2,
    collections: ['Spacing', 'Spacing 2'],
    boundTo: 'Spacing 2/Radius',
    cornerRadius: 12
  })

  // One undo step takes the layer and the renamed collection out together.
  await editor.page.keyboard.press('ControlOrMeta+KeyZ')
  await expect.poll(pasted).toMatchObject({ layers: 1, collections: ['Spacing'] })
})

test('Paste as is keeps how the layer looked and links it to nothing', async () => {
  await editor.page.keyboard.press('ControlOrMeta+KeyV')
  const dialog = editor.page.getByTestId('clipboard-import-dialog')
  await dialog.getByTestId('clipboard-import-as-is').click()

  await expect.poll(pasted).toMatchObject({
    layers: 2,
    collections: ['Spacing'],
    boundTo: null,
    cornerRadius: 12
  })
})

test('Escape cancels the paste', async () => {
  await editor.page.keyboard.press('ControlOrMeta+KeyV')
  const dialog = editor.page.getByTestId('clipboard-import-dialog')
  await expect(dialog).toBeVisible()
  await editor.page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  expect((await pasted()).layers).toBe(2)
})
