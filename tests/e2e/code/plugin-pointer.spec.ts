import { expect, test, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

/**
 * A plugin that takes the next pointer sequence and draws the rectangle the drag covered. A
 * cancelled sequence still runs to its end, so the test can see that Escape reached the plugin.
 */
const PLUGIN_SOURCE = `
  const points = await plugin.pointer()
  if (!points) {
    await plugin.call('create_shape', {
      type: 'RECTANGLE',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      name: 'Cancelled by Escape'
    })
    return 'cancelled'
  }
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const left = Math.min(...xs)
  const top = Math.min(...ys)
  await plugin.call('create_shape', {
    type: 'RECTANGLE',
    x: left,
    y: top,
    width: Math.max(...xs) - left,
    height: Math.max(...ys) - top,
    name: 'From the pointer'
  })
  return points.length
`

function pluginCatalog(): string {
  return JSON.stringify({
    version: 1,
    plugins: [
      {
        id: 'e2e.pointer',
        name: 'Pointer',
        version: '1.0.0',
        command: 'Take pointer',
        capabilities: ['document:write'],
        grants: ['document:write'],
        asked: true,
        enabled: true,
        source: PLUGIN_SOURCE
      }
    ]
  })
}

interface LayerBox {
  x: number
  y: number
  width: number
  height: number
}

/** The page layer with this name, or `null` while the run that makes it has not finished. */
function layerBox(page: Page, name: string): Promise<LayerBox | null> {
  return page.evaluate((wanted) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const current = store.graph.getNode(store.state.currentPageId)
    const node = current?.childIds
      .map((id) => store.graph.getNode(id))
      .find((candidate) => candidate?.name === wanted)
    return node ? { x: node.x, y: node.y, width: node.width, height: node.height } : null
  }, name)
}

/** The document point a canvas pointer lands on, from the canvas area's origin. */
async function documentPoint(page: Page, canvasX: number, canvasY: number) {
  const canvas = await page.getByTestId('canvas-element').boundingBox()
  if (!canvas) throw new Error('Canvas has no bounding box')
  const origin = await new CanvasHelper(page).pointerOrigin()
  return page.evaluate(
    ({ sx, sy }) => {
      const store = window.openPencil?.getStore?.()
      if (!store) throw new Error('OpenPencil store not initialized')
      return store.screenToCanvas(sx, sy)
    },
    { sx: origin.x + canvasX - canvas.x, sy: origin.y + canvasY - canvas.y }
  )
}

async function startPlugin(page: Page): Promise<void> {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+KeyK' : 'Control+KeyK')
  const palette = page.getByRole('dialog', { name: 'Command palette' })
  await palette.getByRole('searchbox', { name: 'Search commands' }).fill('Take pointer')
  await palette.getByRole('option', { name: /Take pointer/ }).click()
  await expect(palette).not.toBeVisible()
}

test.use({
  storageState: async ({ baseURL }, use) => {
    if (!baseURL) throw new Error('Browser test baseURL is required')
    await use({
      cookies: [],
      origins: [
        {
          origin: new URL(baseURL).origin,
          localStorage: [{ name: 'open-pencil:plugins', value: pluginCatalog() }]
        }
      ]
    })
  }
})

test.beforeEach(async ({ page }) => {
  await page.goto('/?test')
  await new CanvasHelper(page).waitForInit()
})

test('a plugin draws the rectangle the pointer drag covered', async ({ page }) => {
  await startPlugin(page)
  const capture = page.getByTestId('plugin-pointer-layer')
  await expect(capture).toBeVisible()

  await new CanvasHelper(page).drag(100, 100, 300, 250)
  await expect(capture).toBeHidden()

  await expect.poll(() => layerBox(page, 'From the pointer')).not.toBeNull()
  const created = await layerBox(page, 'From the pointer')
  if (!created) throw new Error('the plugin drew no layer')
  const start = await documentPoint(page, 100, 100)
  const end = await documentPoint(page, 300, 250)
  expect(Math.abs(created.x - start.x)).toBeLessThan(1)
  expect(Math.abs(created.y - start.y)).toBeLessThan(1)
  expect(Math.abs(created.width - (end.x - start.x))).toBeLessThan(1)
  expect(Math.abs(created.height - (end.y - start.y))).toBeLessThan(1)
})

test('Escape releases the pointer and the plugin sees a cancelled sequence', async ({ page }) => {
  await startPlugin(page)
  const capture = page.getByTestId('plugin-pointer-layer')
  await expect(capture).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(capture).toBeHidden()

  await expect.poll(() => layerBox(page, 'Cancelled by Escape')).not.toBeNull()
  expect(await layerBox(page, 'From the pointer')).toBeNull()
})
