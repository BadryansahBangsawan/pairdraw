import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { expectDefined } from '#tests/helpers/assert'

const editor = useEditorSetupWithClear('/?test')
const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="20" fill="#f00"/><circle cx="20" cy="30" r="8" fill="#00f"/></svg>'
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control'

/** A PNG of one flat colour drawn in the page, as an image service would answer. */
function solidPNG(color: string): Promise<string> {
  return editor.page.evaluate(async (fill) => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 48
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No 2D context')
    context.fillStyle = fill
    context.fillRect(0, 0, 64, 48)
    return canvas.toDataURL('image/png').split(',')[1] ?? ''
  }, color)
}

async function createImageNode(): Promise<{ id: string; hash: string }> {
  return editor.page.evaluate(async () => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const canvas = document.createElement('canvas')
    canvas.width = 120
    canvas.height = 80
    const context = canvas.getContext('2d')
    if (!context) throw new Error('No 2D context')
    context.fillStyle = '#4488cc'
    context.fillRect(0, 0, 120, 80)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error('toBlob'))),
        'image/png'
      )
    })
    const hash = store.storeImage(new Uint8Array(await blob.arrayBuffer()))
    const node = store.graph.createNode('RECTANGLE', store.state.currentPageId, {
      name: 'Photo',
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
    store.select([node.id])
    store.zoomToSelection()
    store.requestRender()
    return { id: node.id, hash }
  })
}

function imageHashOf(id: string): Promise<string | undefined> {
  return editor.page.evaluate(
    (nodeId) => window.pairdraw?.getStore?.().graph.getNode(nodeId)?.fills[0]?.imageHash,
    id
  )
}

async function rightClickSelected(): Promise<void> {
  const box = expectDefined(await editor.canvas.canvas.boundingBox(), 'canvas bounds')
  const point = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    const id = store ? [...store.state.selectedIds][0] : undefined
    const node = id ? store?.graph.getNode(id) : undefined
    if (!store || !node) return null
    return {
      x: (node.x + node.width / 2) * store.state.zoom + store.state.panX,
      y: (node.y + node.height / 2) * store.state.zoom + store.state.panY
    }
  })
  const selected = expectDefined(point, 'selected node screen point')
  await editor.page.mouse.click(box.x + selected.x, box.y + selected.y, { button: 'right' })
}

test.beforeAll(async () => {
  const cutout = await solidPNG('rgba(0,0,0,0)')
  await editor.page.route('https://api.openai.com/v1/images/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [{ b64_json: cutout }] })
    })
  })
  // Recraft, the default vectorize service, draws a vector illustration and links its SVG.
  await editor.page.route(
    'https://external.api.recraft.ai/v1/images/generations',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [{ url: 'https://img.recraft.ai/generated.svg' }] })
      })
    }
  )
  await editor.page.route('https://img.recraft.ai/generated.svg', async (route) => {
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: SVG })
  })
})

test('removing a background asks for a key first, then replaces the image in one undo step', async () => {
  const { id, hash } = await createImageNode()
  await editor.canvas.waitForRender()

  await rightClickSelected()
  await editor.page.getByTestId('context-image-ai').click()
  await editor.page.getByTestId('context-remove-background').click()

  // No key yet: Settings opens on Image services, where the AI images row takes one.
  const dialog = editor.page.getByTestId('app-settings-dialog')
  const row = dialog.locator('[data-image-ai-settings]')
  await expect(row).toBeVisible()
  await row.click()
  await dialog.getByTestId('provider-settings-api-key').fill('sk-test-image')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(row).toBeVisible()
  await editor.page.getByTestId('app-settings-done').click()
  // The page takes pointer input again once the dialog has gone.
  await expect(dialog).toHaveCount(0)
  expect(await imageHashOf(id)).toBe(hash)

  await rightClickSelected()
  await editor.page.getByTestId('context-image-ai').click()
  await editor.page.getByTestId('context-remove-background').click()
  await expect.poll(() => imageHashOf(id)).not.toBe(hash)
  const replaced = await imageHashOf(id)

  await editor.canvas.undo()
  expect(await imageHashOf(id)).toBe(hash)
  await editor.canvas.redo()
  expect(await imageHashOf(id)).toBe(replaced)
  editor.canvas.assertNoErrors()
})

test('replacing a background sends the prompt from the dialog', async () => {
  const { id, hash } = await createImageNode()
  await editor.canvas.waitForRender()
  const prompts: string[] = []
  await editor.page.route('https://api.openai.com/v1/images/edits', async (route) => {
    prompts.push(route.request().postData() ?? '')
    await route.fallback()
  })

  await rightClickSelected()
  await editor.page.getByTestId('context-image-ai').click()
  await editor.page.getByTestId('context-replace-background').click()
  const dialog = editor.page.getByTestId('image-ai-prompt-dialog')
  await expect(dialog.getByTestId('image-ai-prompt-input')).toBeFocused()
  await dialog.getByTestId('image-ai-prompt-input').fill('a sunny beach')
  await dialog.getByTestId('image-ai-prompt-submit').click()
  await expect(dialog).toHaveCount(0)

  await expect.poll(() => imageHashOf(id)).not.toBe(hash)
  expect(prompts.some((body) => body.includes('a sunny beach'))).toBe(true)
  await editor.canvas.undo()
  expect(await imageHashOf(id)).toBe(hash)
})

test('Generate image from the command palette places a selected image layer, undone in one step', async () => {
  // The OpenAI key saved by the first test is still set up in this page.
  const layers = () =>
    editor.page.evaluate(() => {
      const store = window.pairdraw?.getStore?.()
      return store ? store.graph.getChildren(store.state.currentPageId).length : 0
    })
  await editor.page.evaluate(() => window.pairdraw?.getStore?.().select([]))
  const before = await layers()

  await editor.page.keyboard.press(`${MOD}+KeyK`)
  await editor.page.keyboard.type('Generate image')
  await editor.page.keyboard.press('Enter')
  const dialog = editor.page.getByTestId('image-ai-prompt-dialog')
  await expect(dialog.getByTestId('image-ai-orientation')).toBeVisible()
  await dialog.getByTestId('image-ai-prompt-input').fill('a red cup')
  await dialog.getByTestId('image-ai-prompt-submit').click()
  await expect(dialog).toHaveCount(0)

  await expect.poll(layers).toBe(before + 1)
  const placed = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    const id = store ? [...store.state.selectedIds][0] : undefined
    const node = id ? store?.graph.getNode(id) : undefined
    return node ? { type: node.type, fills: node.fills.map((fill) => fill.type) } : null
  })
  expect(placed).toEqual({ type: 'RECTANGLE', fills: ['IMAGE'] })

  await editor.canvas.undo()
  expect(await layers()).toBe(before)
  editor.canvas.assertNoErrors()
})

test('Generate SVG from the command palette places editable layers, undone in one step', async () => {
  const count = () =>
    editor.page.evaluate(() => {
      const store = window.pairdraw?.getStore?.()
      return store ? store.graph.getChildren(store.state.currentPageId).length : 0
    })
  const before = await count()

  await editor.page.keyboard.press(`${MOD}+KeyK`)
  await editor.page.keyboard.type('Generate SVG')
  await editor.page.keyboard.press('Enter')
  const dialog = editor.page.getByTestId('image-ai-prompt-dialog')
  await dialog.getByTestId('image-ai-prompt-input').fill('a flag')
  await editor.page.keyboard.press(`${MOD}+Enter`)

  // Without a Recraft key, Settings opens; the vectorization row takes one.
  const settings = editor.page.getByTestId('app-settings-dialog')
  const row = settings.locator('[data-vectorize-settings]')
  await expect(row).toBeVisible()
  await row.click()
  await settings.getByTestId('provider-settings-api-key').fill('recraft-test')
  await settings.getByRole('button', { name: 'Save', exact: true }).click()
  await editor.page.getByTestId('app-settings-done').click()
  await expect(settings).toHaveCount(0)

  await editor.page.keyboard.press(`${MOD}+KeyK`)
  await editor.page.keyboard.type('Generate SVG')
  await editor.page.keyboard.press('Enter')
  await dialog.getByTestId('image-ai-prompt-input').fill('a flag')
  await dialog.getByTestId('image-ai-prompt-submit').click()
  // The mock answers before the dialog finishes closing, and undo is ignored while it is open.
  await expect(dialog).toHaveCount(0)

  await expect.poll(count).toBe(before + 1)
  const childTypes = await editor.page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    const id = store ? [...store.state.selectedIds][0] : undefined
    const frame = id ? store?.graph.getNode(id) : undefined
    return frame?.childIds.map((child) => store?.graph.getNode(child)?.type) ?? []
  })
  expect(childTypes.length).toBeGreaterThan(0)

  await editor.canvas.undo()
  expect(await count()).toBe(before)
  editor.canvas.assertNoErrors()
})
