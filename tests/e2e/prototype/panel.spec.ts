import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

/** The stored interactions of the node, read through the test bridge. */
async function reactions(page: Page, id: string) {
  return page.evaluate((nodeId) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return store.graph.getNode(nodeId)?.prototypeReactions ?? []
  }, id)
}

test('edits a layer interaction from the prototype section', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  const ids = await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const source = store.createShape('FRAME', 0, 0, 320, 240)
    const target = store.createShape('FRAME', 400, 0, 320, 240)
    store.select([source])
    return { source, target }
  })

  const section = page.getByRole('region', { name: 'Prototype', exact: true })
  await expect(section).toBeVisible()
  await expect(section.getByText('Add interaction')).toBeVisible()

  await section.locator('[data-property="prototype-add"]').first().click()
  await expect(section.locator('[data-property="prototype-reaction"]')).toHaveCount(1)
  expect(await reactions(page, ids.source)).toMatchObject([
    { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', nodeId: null }] }
  ])

  await section.locator('[data-property="prototype-trigger"]').click()
  await page.getByRole('option', { name: 'After delay' }).click()
  await expect(section.locator('[data-property="prototype-delay"]')).toBeVisible()

  await section.locator('[data-property="prototype-destination"]').click()
  await page.getByRole('option', { name: /Frame 2/ }).click()
  expect(await reactions(page, ids.source)).toMatchObject([
    {
      trigger: { type: 'AFTER_TIMEOUT', delay: 1 },
      actions: [{ type: 'NODE', nodeId: ids.target, navigation: 'NAVIGATE' }]
    }
  ])

  await section.locator('[data-property="prototype-action"]').click()
  await page.getByRole('option', { name: 'Open overlay' }).click()
  expect(await reactions(page, ids.source)).toMatchObject([
    {
      actions: [
        {
          type: 'NODE',
          nodeId: ids.target,
          navigation: 'OVERLAY',
          overlayPosition: 'CENTER'
        }
      ]
    }
  ])

  await section.locator('[data-property="prototype-animation"]').click()
  await page.getByRole('option', { name: 'Dissolve' }).click()
  await expect(section.locator('[data-property="prototype-duration"]')).toBeVisible()
  expect(await reactions(page, ids.source)).toMatchObject([
    { actions: [{ transition: { type: 'DISSOLVE', duration: 0.3 } }] }
  ])

  await section.locator('[data-property="prototype-remove"]').click()
  await expect(section.locator('[data-property="prototype-reaction"]')).toHaveCount(0)
  expect(await reactions(page, ids.source)).toEqual([])
})

test('keeps one undo step per interaction edit', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  const id = await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const frame = store.createShape('FRAME', 0, 0, 320, 240)
    store.select([frame])
    return frame
  })

  const section = page.getByRole('region', { name: 'Prototype', exact: true })
  await section.locator('[data-property="prototype-add"]').first().click()
  await section.locator('[data-property="prototype-trigger"]').click()
  await page.getByRole('option', { name: 'After delay' }).click()

  await page.keyboard.press('ControlOrMeta+KeyZ')
  expect(await reactions(page, id)).toMatchObject([{ trigger: { type: 'ON_CLICK' } }])
})

test('hides the section for a connector', async ({ page }) => {
  await page.goto('/?test')
  const canvas = new CanvasHelper(page)
  await canvas.waitForInit()

  await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const id = store.createShape('CONNECTOR', 0, 0, 40, 40)
    store.select([id])
  })

  await expect(page.getByRole('region', { name: 'Prototype', exact: true })).toHaveCount(0)
})
