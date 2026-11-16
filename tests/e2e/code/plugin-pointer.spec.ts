import { expect, test, type JSHandle, type Page } from '@playwright/test'

import type { Rect } from '@pairdraw/scene-graph/primitives'

import type { EditorStore } from '@/app/editor/session/create'

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

/**
 * A plugin that asks for the pointer again as soon as a sequence ends, so only cancelling the
 * sequence can stop it; it swallows the refusal and keeps looping until the run's deadline ends it.
 */
const LOOPING_SOURCE = `
  while (true) {
    try {
      await plugin.pointer()
    } catch (error) {
      if (!String(error.message).includes('cancelled')) throw error
    }
  }
`

function pluginCatalog(source = PLUGIN_SOURCE): string {
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
        source
      }
    ]
  })
}

type LayerBox = Rect

/** The page layer with this name, or `null` while the run that makes it has not finished. */
function layerBox(page: Page, name: string): Promise<LayerBox | null> {
  return page.evaluate((wanted) => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const current = store.graph.getNode(store.state.currentPageId)
    const node = current?.childIds
      .map((id) => store.graph.getNode(id))
      .find((candidate) => candidate?.name === wanted)
    return node ? { x: node.x, y: node.y, width: node.width, height: node.height } : null
  }, name)
}

/** The layer names on the active document's page, in order. */
function layerNames(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const current = store.graph.getNode(store.state.currentPageId)
    return current ? current.childIds.map((id) => store.graph.getNode(id)?.name ?? '') : []
  })
}

/** The document point a canvas pointer lands on, from the canvas area's origin. */
async function documentPoint(page: Page, canvasX: number, canvasY: number) {
  const canvas = await page.getByTestId('canvas-element').boundingBox()
  if (!canvas) throw new Error('Canvas has no bounding box')
  const origin = await new CanvasHelper(page).pointerOrigin()
  return page.evaluate(
    ({ sx, sy }) => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Pairdraw store not initialized')
      return store.screenToCanvas(sx, sy)
    },
    { sx: origin.x + canvasX - canvas.x, sy: origin.y + canvasY - canvas.y }
  )
}

/** Picks the plugin's command from the palette and waits for the palette to leave the canvas. */
async function startPlugin(page: Page): Promise<void> {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+KeyK' : 'Control+KeyK')
  const palette = page.getByRole('dialog', { name: 'Command palette' })
  await palette.getByRole('searchbox', { name: 'Search commands' }).fill('Take pointer')
  await palette.getByRole('option', { name: /Take pointer/ }).click()
  // The closing dialog still takes the next press while its exit animation runs.
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
          localStorage: [{ name: 'pairdraw:plugins', value: pluginCatalog() }]
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

test('only a primary press this layer started ends the sequence', async ({ page }) => {
  await startPlugin(page)
  const capture = page.getByTestId('plugin-pointer-layer')
  await expect(capture).toBeVisible()
  const box = await capture.boundingBox()
  if (!box) throw new Error('the pointer layer has no box')
  const start = { clientX: box.x + 60, clientY: box.y + 60 }

  // A release over the layer with no press on it ends nothing.
  await capture.dispatchEvent('pointerup', {
    pointerId: 1,
    pointerType: 'mouse',
    button: 0,
    buttons: 0,
    ...start
  })
  await expect(capture).toBeVisible()

  // Nor does another button's release during a sequence this layer did start.
  await page.mouse.move(start.clientX, start.clientY)
  await page.mouse.down()
  await page.mouse.move(box.x + 120, box.y + 120)
  await capture.dispatchEvent('pointerup', {
    pointerId: 1,
    pointerType: 'mouse',
    button: 2,
    buttons: 1,
    clientX: box.x + 120,
    clientY: box.y + 120
  })
  await expect(capture).toBeVisible()

  await page.mouse.up()
  await expect(capture).toHaveCount(0)
  await expect.poll(() => layerBox(page, 'From the pointer')).not.toBeNull()
})

test.describe('a plugin waiting for the pointer when its document goes away', () => {
  /** Opens a second document in a tab of its own and makes it the one in front. */
  async function newDocument(page: Page) {
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+KeyN' : 'Control+KeyN')
    await expect(page.getByTestId('tabbar-tab')).toHaveCount(2)
  }

  /** Waits for the document in front to draw; a switch already booted the app. */
  function waitForCanvas(page: Page) {
    return page.getByTestId('canvas-element').and(page.locator('[data-ready="1"]')).waitFor()
  }

  /** The active document's store, kept so its layers can be read after another tab takes over. */
  function documentStore(page: Page) {
    return page.evaluateHandle(() => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Pairdraw store not initialized')
      return store
    })
  }

  /** The layer names on the page of a document read through its store, wherever it is now. */
  function namesIn(page: Page, store: JSHandle<EditorStore>): Promise<string[]> {
    return page.evaluate((document) => {
      const current = document.graph.getNode(document.state.currentPageId)
      return current ? current.childIds.map((id) => document.graph.getNode(id)?.name ?? '') : []
    }, store)
  }

  /** Starts the plugin on the document in front and waits for it to hold the pointer. */
  async function waitForPointer(page: Page) {
    await startPlugin(page)
    await expect(page.getByTestId('plugin-pointer-layer')).toBeVisible()
  }

  /** Draws a rectangle with the editor's own tool, which a capture layer would swallow. */
  async function drawRectangle(canvas: CanvasHelper) {
    await canvas.selectTool('rectangle')
    await canvas.drag(120, 120, 320, 260, 3)
  }

  test('switching to another document leaves its canvas to the editor', async ({ page }) => {
    const canvas = new CanvasHelper(page)
    const first = await documentStore(page)
    try {
      await waitForPointer(page)
      await newDocument(page)
      await expect(page.getByTestId('tabbar-tab').last()).toHaveAttribute('aria-selected', 'true')
      await waitForCanvas(page)

      // The other document takes its own drags, with no capture layer over it.
      await expect(page.getByTestId('plugin-pointer-layer')).toHaveCount(0)
      await drawRectangle(canvas)
      expect(await layerNames(page)).toHaveLength(1)
      // The drag went to this document, not to the one the plugin waits on.
      expect(await namesIn(page, first)).not.toContain('From the pointer')
    } finally {
      await first.dispose()
    }
  })

  test('switching to another document frees the run slot', async ({ page }) => {
    const first = await documentStore(page)
    try {
      await waitForPointer(page)
      await newDocument(page)
      await expect(page.getByTestId('tabbar-tab').last()).toHaveAttribute('aria-selected', 'true')

      // The run ended with a cancelled sequence instead of holding its document's pointer.
      await expect.poll(() => namesIn(page, first)).toContain('Cancelled by Escape')
      // A second run starts: the slot the first one held is free.
      await waitForPointer(page)
      await page.keyboard.press('Escape')
    } finally {
      await first.dispose()
    }
  })

  test('closing the document tab leaves the remaining canvas to the editor', async ({ page }) => {
    const canvas = new CanvasHelper(page)
    await newDocument(page)
    const closed = await documentStore(page)
    try {
      await waitForPointer(page)

      const pluginTab = page.locator('[data-slot="tab-item"]').last()
      await pluginTab.hover()
      await pluginTab.getByRole('button', { name: /Close/ }).click()
      await expect(page.getByTestId('tabbar-tab')).toHaveCount(1)
      await waitForCanvas(page)

      // The document that remains draws with the editor, not through a capture layer.
      await expect(page.getByTestId('plugin-pointer-layer')).toHaveCount(0)
      await drawRectangle(canvas)
      expect(await layerNames(page)).toHaveLength(1)
    } finally {
      await closed.dispose()
    }
  })

  test('closing the document tab frees the run slot', async ({ page }) => {
    await newDocument(page)
    const closed = await documentStore(page)
    try {
      await waitForPointer(page)

      const pluginTab = page.locator('[data-slot="tab-item"]').last()
      await pluginTab.hover()
      await pluginTab.getByRole('button', { name: /Close/ }).click()
      await expect(page.getByTestId('tabbar-tab')).toHaveCount(1)

      // The closed document's run ended with a cancelled sequence.
      await expect.poll(() => namesIn(page, closed)).toContain('Cancelled by Escape')
      // A second run starts: the slot the first one held is free.
      await waitForPointer(page)
      await page.keyboard.press('Escape')
    } finally {
      await closed.dispose()
    }
  })
})

test.describe('a plugin that asks for the pointer again', () => {
  test.use({
    storageState: async ({ baseURL }, use) => {
      if (!baseURL) throw new Error('Browser test baseURL is required')
      await use({
        cookies: [],
        origins: [
          {
            origin: new URL(baseURL).origin,
            localStorage: [{ name: 'pairdraw:plugins', value: pluginCatalog(LOOPING_SOURCE) }]
          }
        ]
      })
    }
  })

  test('a cancelled sequence ends the run instead of taking the canvas again', async ({ page }) => {
    await startPlugin(page)
    const capture = page.getByTestId('plugin-pointer-layer')
    await expect(capture).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(capture).toHaveCount(0)

    const timedOut = page.locator('[data-slot="toast"]').filter({ hasText: 'Plugin timed out.' })
    await expect(timedOut).toBeVisible()
    await expect(capture).toHaveCount(0)
  })
})
