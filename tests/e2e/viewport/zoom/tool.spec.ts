import type { Page } from '@playwright/test'

import { expect, test, useEditorSetup } from '#tests/e2e/fixtures'
import {
  toolbarFlyoutItemTestId,
  toolbarFlyoutTestId,
  toolbarToolTestId
} from '#tests/helpers/test-ids'

const editor = useEditorSetup('/?test&no-rulers')

async function view(page: Page) {
  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const { panX, panY, zoom, activeTool } = store.state
    return { panX, panY, zoom, activeTool }
  })
}

async function resetView(page: Page) {
  await page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.setTool('SELECT')
    store.state.panX = 0
    store.state.panY = 0
    store.state.zoom = 1
    store.requestRepaint()
  })
}

test.beforeEach(async () => {
  await resetView(editor.page)
})

test('tapping Z picks the zoom tool; a click zooms in, ⌥ and a click out', async () => {
  await editor.canvas.pressKey('z')
  expect((await view(editor.page)).activeTool).toBe('ZOOM')

  await editor.canvas.click(300, 200)
  await editor.canvas.waitForRender()
  const zoomedIn = await view(editor.page)
  expect(zoomedIn.zoom).toBe(2)
  // The point under the pointer stays under it, within the half pixel a mouse event rounds off.
  expect(zoomedIn.panX).toBeCloseTo(300 - 300 * 2, 0)
  expect(zoomedIn.panY).toBeCloseTo(200 - 200 * 2, 0)

  await editor.page.keyboard.down('Alt')
  await editor.canvas.click(300, 200)
  await editor.page.keyboard.up('Alt')
  await editor.canvas.waitForRender()
  expect((await view(editor.page)).zoom).toBe(1)
  editor.canvas.assertNoErrors()
})

test('holding Z zooms with a click and goes back to the tool before on release', async () => {
  await editor.canvas.pressKey('p')
  await editor.page.keyboard.down('z')
  expect((await view(editor.page)).activeTool).toBe('ZOOM')
  await editor.canvas.click(300, 200)
  await editor.page.keyboard.up('z')
  const after = await view(editor.page)
  expect(after.zoom).toBe(2)
  expect(after.activeTool).toBe('PEN')
})

test('a drag with the zoom tool zooms to the dragged area', async () => {
  await editor.canvas.pressKey('z')
  await editor.canvas.drag(100, 100, 300, 200)
  await editor.canvas.waitForRender()
  const after = await view(editor.page)
  const frame = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    return { size: store.getViewportSize(), insets: store.getViewportInsets() }
  })
  const visibleWidth = frame.size.width - frame.insets.left - frame.insets.right
  const visibleHeight = frame.size.height - frame.insets.top - frame.insets.bottom
  // The viewport counts whole pixels and the pointer lands within half a pixel of each end.
  expect(after.zoom).toBeCloseTo(Math.min(visibleWidth / 200, visibleHeight / 100), 1)
  // The area's center lands at the center of the room the floating chrome leaves.
  const centerX = frame.insets.left + visibleWidth / 2
  const centerY = frame.insets.top + visibleHeight / 2
  expect((centerX - after.panX) / after.zoom).toBeCloseTo(200, 0)
  expect((centerY - after.panY) / after.zoom).toBeCloseTo(150, 0)
})

test("the zoom tool sits in the Hand tool's flyout", async () => {
  await editor.page.getByTestId(toolbarFlyoutTestId('HAND')).click()
  await editor.page.getByTestId(toolbarFlyoutItemTestId('ZOOM')).click()
  await expect(editor.page.getByTestId(toolbarToolTestId('ZOOM'))).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  expect((await view(editor.page)).activeTool).toBe('ZOOM')
})
