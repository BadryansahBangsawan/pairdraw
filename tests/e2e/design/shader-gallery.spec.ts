import type { Page } from '@playwright/test'

import { shaderPresetKey } from '@pairdraw/scene-graph/shaders'
import { DEFAULT_SHADER_PRESET, SHADER_GALLERY } from '@pairdraw/vue/controls/shader'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

// A shader fill starts from the gallery: one click on a complete shader replaces the paint's
// preset as one undo step, and the canvas draws the frame the shader renders.

const ctx = useEditorSetupWithClear()

async function expectCanvas(name: string) {
  ctx.canvas.assertNoErrors()
  // Only the canvas around the layer: the properties panel beside it is not what is checked.
  const buffer = await ctx.canvas.screenshotCanvasRegion(600, 400)
  expect(buffer).toMatchSnapshot(`${name}.png`)
}

/** Whether this browser has a WebGPU adapter, which draws shader frames. */
function hasWebGPU(page: Page) {
  return page.evaluate(async () => {
    const gpu: unknown = Reflect.get(navigator, 'gpu')
    if (typeof gpu !== 'object' || gpu === null || !('requestAdapter' in gpu)) return false
    const request = gpu.requestAdapter
    if (typeof request !== 'function') return false
    return Boolean(await request.call(gpu))
  })
}

function galleryPreset(id: string) {
  const entry = SHADER_GALLERY.find((item) => item.id === id)
  if (!entry) throw new Error(`No gallery shader ${id}`)
  return entry.preset
}

/** The preset each shader paint of the selected layer draws, and whether its frame is drawn. */
function selectedShaders(page: Page) {
  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const id = [...store.state.selectedIds][0]
    const node = id ? store.graph.getNode(id) : undefined
    return (node?.pluginData ?? [])
      .filter((item) => item.key === 'shader')
      .map((item) => {
        const value: unknown = JSON.parse(item.value)
        if (typeof value !== 'object' || value === null) return { preset: null, drawn: false }
        return {
          preset: 'preset' in value ? value.preset : null,
          drawn: 'frame' in value
        }
      })
  })
}

/** Draws a rectangle and opens its fill on the shader tab, which shows the gallery. */
async function openShaderGallery(page: Page) {
  await ctx.canvas.drawRect(160, 160, 240, 160)
  await page.getByTestId('fill-picker-swatch').first().click()
  await page.getByTestId('fill-picker-tab-shader').click()
  const gallery = page.getByTestId('shader-gallery')
  await expect(gallery).toBeVisible()
  return gallery
}

test('a gallery shader replaces the fill in one click and one undo step', async () => {
  const page = ctx.page
  const gallery = await openShaderGallery(page)
  await expect
    .poll(async () => (await selectedShaders(page))[0]?.preset)
    .toEqual(DEFAULT_SHADER_PRESET)

  const sunset = gallery.getByRole('radio', { name: 'Sunset' })
  await sunset.click()
  await expect(sunset).toHaveAttribute('aria-checked', 'true')
  await expect
    .poll(async () => (await selectedShaders(page))[0]?.preset)
    .toEqual(galleryPreset('sunset'))

  await page.keyboard.press('Escape')
  await ctx.canvas.undo()
  await expect
    .poll(async () => (await selectedShaders(page))[0]?.preset)
    .toEqual(DEFAULT_SHADER_PRESET)
  ctx.canvas.assertNoErrors()
})

test('the canvas draws the saved frame of an applied gallery shader', async () => {
  const page = ctx.page
  const gallery = await openShaderGallery(page)
  await gallery.getByRole('radio', { name: 'Neon grid' }).click()
  const preset = galleryPreset('neonGrid')
  await expect.poll(async () => (await selectedShaders(page))[0]?.preset).toEqual(preset)
  await page.keyboard.press('Escape')
  // Where WebGPU draws frames, the one under way would replace the fixture below; once it is
  // stored, this session counts it current and draws no other for the same preset and size.
  if (await hasWebGPU(page)) {
    await expect
      .poll(async () => (await selectedShaders(page))[0]?.drawn, { timeout: 15_000 })
      .toBe(true)
  }

  // A fixed frame, saved for the layer's size and the applied preset, so nothing draws it again
  // and the snapshot is the same on every GPU, and without one.
  const frame = await page.evaluate(async () => {
    const canvas = new OffscreenCanvas(32, 32)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Cannot create frame fixture canvas')
    const gradient = context.createLinearGradient(0, 0, 32, 32)
    gradient.addColorStop(0, '#ec4899')
    gradient.addColorStop(1, '#0f172a')
    context.fillStyle = gradient
    context.fillRect(0, 0, 32, 32)
    return [...new Uint8Array(await (await canvas.convertToBlob()).arrayBuffer())]
  })
  await page.evaluate(
    ({ frame, presetKey }) => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Pairdraw store not initialized')
      const id = [...store.state.selectedIds][0]
      const node = id ? store.graph.getNode(id) : undefined
      const hash = node?.fills[0]?.imageHash
      if (!node || !hash) throw new Error('No shader paint')
      store.graph.images.set(hash, new Uint8Array(frame))
      for (const renderer of store.canvasRenderers) renderer.forgetImage(hash)
      const entry = node.pluginData.find((item) => item.key === 'shader')
      if (!entry) throw new Error('No shader entry')
      const value: unknown = JSON.parse(entry.value)
      if (typeof value !== 'object' || value === null) throw new Error('Unreadable shader entry')
      const size = { width: node.width, height: node.height }
      const current = { ...value, frame: { ...size, preset: presetKey } }
      store.graph.updateNode(node.id, {
        pluginData: node.pluginData.map((item) =>
          item === entry ? { ...item, value: JSON.stringify(current) } : item
        )
      })
      store.clearSelection()
      store.requestRender()
    },
    { frame, presetKey: shaderPresetKey(preset) }
  )
  await ctx.canvas.waitForRender()
  await expectCanvas('shader-gallery-neon-grid')
})

test('WebGPU draws the frame of an applied gallery shader', async () => {
  const page = ctx.page
  test.skip(
    !(await hasWebGPU(page)),
    'Shader frames are drawn with WebGPU, which this browser lacks'
  )

  const gallery = await openShaderGallery(page)
  await gallery.getByRole('radio', { name: 'Neon grid' }).click()
  await expect
    .poll(async () => (await selectedShaders(page))[0], { timeout: 15_000 })
    .toEqual({ preset: galleryPreset('neonGrid'), drawn: true })
  ctx.canvas.assertNoErrors()
})
