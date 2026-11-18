import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

// Figma names a text layer after its characters while autoRename is on.
let page: Page
let canvas: CanvasHelper

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage()
  await page.goto('/?test&no-rulers')
  canvas = new CanvasHelper(page)
  await canvas.waitForInit()
})

test.afterAll(async () => {
  await page.close()
})

function textLayer() {
  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    const node = [...(store?.graph.getAllNodes() ?? [])].find((item) => item.type === 'TEXT')
    return node ? { name: node.name, text: node.text, autoRename: node.autoRename } : null
  })
}

test('typing into a new text layer names it after its characters', async () => {
  await canvas.clearCanvas()
  await canvas.selectTool('text')
  await canvas.click(300, 300)
  await page.keyboard.type('Inside frame')
  await page.keyboard.press('Escape')
  await canvas.waitForRender()
  expect(await textLayer()).toEqual({
    name: 'Inside frame',
    text: 'Inside frame',
    autoRename: true
  })
})
