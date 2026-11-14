import type { Page } from '@playwright/test'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { propertySection } from '#tests/helpers/properties'

// Figma desktop 126: a text layer's font family binds to a text variable from the Typography
// section; the family follows the variable's mode, and detaching keeps the family it last gave.

const editor = useEditorSetupWithClear('/?test')

interface Scene {
  text: string
  family: string
  collection: string
  serif: string
}

/** A text layer in Inter and a Brand collection whose `type/family` names Inter, or Lora in Serif. */
function build(page: Page): Promise<Scene> {
  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const graph = store.graph
    // The page is cleared between tests; the variables an earlier test made are not.
    for (const id of graph.variableCollections.keys()) graph.removeCollection(id)
    const brand = graph.createCollection('Brand')
    const serif = graph.createMode(brand.id, 'Serif') ?? ''
    const family = graph.createVariable('type/family', 'STRING', brand.id, 'Inter')
    family.valuesByMode[serif] = 'Lora'
    const text = graph.createNode('TEXT', store.state.currentPageId, {
      name: 'Headline',
      text: 'Hello',
      fontFamily: 'Inter',
      width: 120,
      height: 24
    })
    store.select([text.id])
    store.requestRender()
    return { text: text.id, family: family.id, collection: brand.id, serif }
  })
}

/** The layer's family and the variable it follows, if any. */
function fontFamily(page: Page, id: string) {
  return page.evaluate((nodeId) => {
    const node = window.pairdraw?.getStore?.().graph.getNode(nodeId)
    return { family: node?.fontFamily, variable: node?.boundVariables.fontFamily }
  }, id)
}

test('a font family binds to a text variable and follows its mode', async () => {
  const page = editor.page
  const scene = await build(page)
  const typography = propertySection(page, 'Typography')

  await typography.getByRole('button', { name: 'Apply variable to font family' }).click()
  const picker = page.getByRole('dialog', { name: 'Apply variable to font family' })
  await picker.getByRole('option', { name: /type\/family/ }).click()

  await expect
    .poll(() => fontFamily(page, scene.text))
    .toEqual({ family: 'Inter', variable: scene.family })
  const bound = typography.getByTestId('font-family-binding')
  await expect(bound).toContainText('type/family')

  await page.evaluate(
    ({ collection, serif }) => window.pairdraw?.getStore?.().setActiveMode(collection, serif),
    scene
  )
  await expect.poll(async () => (await fontFamily(page, scene.text)).family).toBe('Lora')
  await expect(bound).toContainText('Lora')

  await typography.getByRole('button', { name: 'Apply variable to font family' }).click()
  await picker.getByRole('button', { name: 'Detach variable' }).click()
  await expect
    .poll(() => fontFamily(page, scene.text))
    .toEqual({ family: 'Lora', variable: undefined })
  await expect(typography.getByTestId('font-family-binding')).toHaveCount(0)
})

test('undo takes a font family binding back to the family the layer had', async () => {
  const page = editor.page
  const scene = await build(page)
  await page.evaluate(
    ({ collection, serif }) => window.pairdraw?.getStore?.().setActiveMode(collection, serif),
    scene
  )
  const typography = propertySection(page, 'Typography')

  await typography.getByRole('button', { name: 'Apply variable to font family' }).click()
  await page
    .getByRole('dialog', { name: 'Apply variable to font family' })
    .getByRole('option', { name: /type\/family/ })
    .click()
  await expect.poll(async () => (await fontFamily(page, scene.text)).family).toBe('Lora')

  await page.keyboard.press('ControlOrMeta+z')
  await expect
    .poll(() => fontFamily(page, scene.text))
    .toEqual({ family: 'Inter', variable: undefined })
})

test('a font picked for bound and unbound layers detaches the binding from both', async () => {
  const page = editor.page
  const scene = await build(page)
  const other = await page.evaluate(({ text, family }) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.bindVariable(text, 'fontFamily', family)
    const plain = store.graph.createNode('TEXT', store.state.currentPageId, {
      name: 'Caption',
      text: 'World',
      fontFamily: 'Lora',
      y: 40,
      width: 120,
      height: 24
    })
    store.select([text, plain.id])
    store.requestRender()
    return plain.id
  }, scene)
  const typography = propertySection(page, 'Typography')

  // One layer follows the variable and one does not, so the field offers the font picker.
  await expect(typography.getByTestId('font-family-binding')).toHaveCount(0)
  await typography.getByTestId('font-picker-trigger').click()
  await page.getByRole('combobox', { name: 'Search fonts…' }).fill('Inter')
  await page
    .getByTestId('font-picker-item')
    .filter({ hasText: /^Interbundled$/ })
    .click()

  for (const id of [scene.text, other])
    await expect.poll(() => fontFamily(page, id)).toEqual({ family: 'Inter', variable: undefined })
  // The variable no longer reaches the layer it was bound to.
  await page.evaluate(
    ({ collection, serif }) => window.pairdraw?.getStore?.().setActiveMode(collection, serif),
    scene
  )
  await expect
    .poll(() => fontFamily(page, scene.text))
    .toEqual({ family: 'Inter', variable: undefined })
})
