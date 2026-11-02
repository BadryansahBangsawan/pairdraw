import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { expectDefined } from '#tests/helpers/assert'

const editor = useEditorSetupWithClear('/?test')
const MOCK_SVG = readFileSync(
  join(process.cwd(), 'tests/fixtures/vectorize/euro_shield.recraft.svg'),
  'utf8'
)

async function rightClickSelected(): Promise<void> {
  const box = expectDefined(await editor.canvas.canvas.boundingBox(), 'canvas bounds')
  const point = await editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store || store.state.selectedIds.size !== 1) return null
    const node = store.graph.getNode([...store.state.selectedIds][0])
    if (!node) return null
    return {
      x: (node.x + node.width / 2) * store.state.zoom + store.state.panX,
      y: (node.y + node.height / 2) * store.state.zoom + store.state.panY
    }
  })
  const selectedPoint = expectDefined(point, 'selected node screen point')
  await editor.page.mouse.click(box.x + selectedPoint.x, box.y + selectedPoint.y, {
    button: 'right'
  })
}

type ImageLayerType = 'RECTANGLE' | 'ELLIPSE' | 'FRAME'

async function createImageNode(type: ImageLayerType = 'RECTANGLE'): Promise<string> {
  return editor.page.evaluate(async (layerType) => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')

    const imageCanvas = document.createElement('canvas')
    imageCanvas.width = 120
    imageCanvas.height = 80
    const context = imageCanvas.getContext('2d')
    if (!context) throw new Error('Cannot create image fixture canvas')
    context.fillStyle = '#4488cc'
    context.fillRect(0, 0, 120, 80)
    const blob = await new Promise<Blob>((resolve, reject) => {
      imageCanvas.toBlob((result) => {
        if (result) resolve(result)
        else reject(new Error('toBlob failed'))
      }, 'image/png')
    })
    const hash = store.storeImage(new Uint8Array(await blob.arrayBuffer()))
    const node = store.graph.createNode(layerType, store.state.currentPageId, {
      name: 'Vectorize Target',
      x: 180,
      y: 180,
      width: 120,
      height: 80,
      fills: [
        {
          type: 'IMAGE',
          color: { r: 0, g: 0, b: 0, a: 1 },
          visible: true,
          opacity: 1,
          imageHash: hash,
          imageScaleMode: 'FILL'
        }
      ]
    })
    // A frame keeps its children when its image is vectorized.
    if (layerType === 'FRAME') {
      store.graph.createNode('RECTANGLE', node.id, { name: 'Badge', width: 20, height: 20 })
    }
    store.select([node.id])
    store.zoomToSelection()
    store.requestRender()
    return node.id
  }, type)
}

function pageChildIds(): Promise<string[]> {
  return editor.page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) return []
    return store.graph.getChildren(store.state.currentPageId).map((node) => node.id)
  })
}

test.beforeAll(async () => {
  await editor.page.route('**/external.api.recraft.ai/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ image: { url: 'https://cdn.recraft.ai/mock.svg' } })
    })
  })
  await editor.page.route('https://cdn.recraft.ai/mock.svg', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: MOCK_SVG })
  })
})

test('Convert to vector appears for any single layer showing an image', async () => {
  for (const type of ['RECTANGLE', 'ELLIPSE', 'FRAME'] as const) {
    await createImageNode(type)
    await editor.canvas.waitForRender()
    await rightClickSelected()
    await expect(editor.page.getByTestId('context-vectorize')).toBeVisible()
    await editor.page.keyboard.press('Escape')
    await editor.page.evaluate(() => {
      const store = window.openPencil?.getStore?.()
      if (store) store.graph.deleteNode([...store.state.selectedIds][0])
    })
  }

  await editor.canvas.drawRect(400, 400, 60, 60)
  await rightClickSelected()
  await expect(editor.page.getByTestId('context-vectorize')).toHaveCount(0)
  editor.canvas.assertNoErrors()
})

test('missing key opens Media settings and saves through the credential manager', async () => {
  const nodeId = await createImageNode()
  await editor.canvas.waitForRender()

  await rightClickSelected()
  await editor.page.getByTestId('context-vectorize').click()
  const dialog = editor.page.getByTestId('app-settings-dialog')
  const vectorizeRow = dialog.locator('[data-vectorize-settings]')
  await expect(vectorizeRow).toBeVisible()

  // The provider row opens its key editor; saving returns to the Media list.
  await vectorizeRow.click()
  await dialog.getByTestId('provider-settings-api-key').fill('test-recraft-key')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(vectorizeRow).toBeVisible()
  await editor.page.getByTestId('app-settings-done').click()
  await expect(editor.page.getByTestId('app-settings-dialog')).toHaveCount(0)
  expect(
    await editor.page.evaluate(
      (id) => window.openPencil?.getStore?.().graph.getNode(id)?.type,
      nodeId
    )
  ).toBe('RECTANGLE')
})

test('vectorize keeps the image and adds editable vectors beside it, undone in one step', async () => {
  const nodeId = await createImageNode()
  await editor.canvas.waitForRender()
  const before = await pageChildIds()

  await rightClickSelected()
  await editor.page.getByTestId('context-vectorize').click()
  await expect.poll(pageChildIds).toHaveLength(before.length + 1)

  const result = await editor.page.evaluate((sourceId) => {
    const store = window.openPencil?.getStore?.()
    if (!store || store.state.selectedIds.size !== 1) return null
    const frameId = [...store.state.selectedIds][0]
    const frame = store.graph.getNode(frameId)
    const source = store.graph.getNode(sourceId)
    if (!frame || !source) return null
    return {
      sourceType: source.type,
      type: frame.type,
      besideSource: frame.x >= source.x + source.width,
      childTypes: frame.childIds.map((id) => store.graph.getNode(id)?.type)
    }
  }, nodeId)
  expect(result?.sourceType).toBe('RECTANGLE')
  expect(result?.type).toBe('FRAME')
  expect(result?.besideSource).toBe(true)
  expect(result?.childTypes.filter((type) => type === 'VECTOR').length).toBeGreaterThan(1)

  await editor.canvas.undo()
  await editor.canvas.waitForRender()
  expect(await pageChildIds()).toEqual(before)
  editor.canvas.assertNoErrors()
})

test('an agent vectorizes an image through the app bridge with the saved key', async () => {
  const nodeId = await createImageNode('ELLIPSE')
  await editor.canvas.waitForRender()
  const before = await pageChildIds()

  // A tool call as the MCP bridge delivers it; the key saved above stays in the app.
  const response = await editor.page.evaluate(
    (id) =>
      window.openPencil?.test?.automation?.('tool', {
        name: 'vectorize_image',
        args: { id },
        agent: { session: 'vectorize-session', kind: 'mcp', client: 'claude-code' }
      }),
    nodeId
  )
  expect(response).toMatchObject({ ok: true, result: { type: 'FRAME', source_id: nodeId } })
  expect(await pageChildIds()).toEqual([...before, expect.any(String)])
  expect(
    await editor.page.evaluate(
      (id) => window.openPencil?.getStore?.().graph.getNode(id)?.type,
      nodeId
    )
  ).toBe('ELLIPSE')
  editor.canvas.assertNoErrors()
})
