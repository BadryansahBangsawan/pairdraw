import type { Page } from '@playwright/test'

import { SHADER_GALLERY } from '@open-pencil/vue/controls/shader'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

// Shader Mode shows one shader paint large on its own: it plays, pauses, and scrubs through the
// animation, its settings beside it change the paint as one undo step each, and Done or Escape
// returns to the editor as it was.

const ctx = useEditorSetupWithClear()

/** Whether this browser has a WebGPU adapter, which plays shaders. */
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

/** Resolves after `count` animation frames, in which a playing clock would move. */
function afterFrames(page: Page, count: number) {
  return page.evaluate(
    (frames) =>
      new Promise<void>((resolve) => {
        const step = (left: number) =>
          left === 0 ? resolve() : requestAnimationFrame(() => step(left - 1))
        step(frames)
      }),
    count
  )
}

/** The preset Shader Mode shows, or null while it is closed. */
function shownPreset(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    return store.getShaderMode()?.preset ?? null
  })
}

/** The selected layer and where it sits. */
function selectedLayer(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const [id] = store.state.selectedIds
    const node = id ? store.graph.getNode(id) : undefined
    return { id: id ?? null, x: node?.x ?? null, y: node?.y ?? null }
  })
}

/** Draws a rectangle, makes its fill a shader, and opens it in Shader Mode from the picker. */
async function openShaderMode(page: Page) {
  await ctx.canvas.drawRect(160, 160, 240, 120)
  await page.getByTestId('fill-picker-swatch').first().click()
  await page.getByTestId('fill-picker-tab-shader').click()
  await page.getByRole('button', { name: 'Open in Shader Mode' }).click()
  const stage = page.getByTestId('shader-mode')
  await expect(stage).toBeVisible()
  return stage
}

test('opens a shader fill large on its own and leaves back to the editor', async () => {
  const page = ctx.page
  const stage = await openShaderMode(page)

  await expect(stage.getByRole('heading', { name: 'Shader Mode' })).toBeVisible()
  await expect(stage.getByTestId('shader-mode-preview')).toBeVisible()
  await expect(stage.getByRole('slider', { name: 'Animation phase' })).toBeVisible()
  await expect(stage.getByRole('complementary', { name: 'Shader settings' })).toBeVisible()
  // The preview keeps the layer's proportions.
  const box = await stage.getByTestId('shader-mode-preview').boundingBox()
  expect(box && Math.round((box.width / box.height) * 10) / 10).toBe(2)
  await expect(page.getByTestId('chat-column')).toBeHidden()

  await page.keyboard.press('Escape')
  await expect(stage).toBeHidden()
  await expect(page.locator('#editor-properties-panel')).toBeVisible()
  // The button that opened Shader Mode went with the editor; its paint's swatch takes focus.
  await expect(page.getByTestId('fill-picker-swatch').first()).toBeFocused()

  await page.getByTestId('fill-picker-swatch').first().click()
  await page.getByRole('button', { name: 'Open in Shader Mode' }).click()
  await expect(stage).toBeVisible()
  await stage.getByTestId('shader-mode-done').click()
  await expect(stage).toBeHidden()
  ctx.canvas.assertNoErrors()
})

test('tunes the shader from its settings, each change one undo step', async () => {
  const page = ctx.page
  const stage = await openShaderMode(page)
  const settings = stage.getByRole('complementary', { name: 'Shader settings' })
  const before = await shownPreset(page)

  await settings.getByRole('radio', { name: 'Sunset' }).click()
  await expect.poll(() => shownPreset(page)).toEqual(galleryPreset('sunset'))

  // Undo reaches the document from inside Shader Mode, which stays open on the shader.
  await stage.focus()
  await page.keyboard.press('ControlOrMeta+KeyZ')
  await expect.poll(() => shownPreset(page)).toEqual(before)
  await expect(stage).toBeVisible()
  ctx.canvas.assertNoErrors()
})

test('plays, pauses, and scrubs through the animation', async () => {
  const page = ctx.page
  const stage = await openShaderMode(page)
  const webgpu = await hasWebGPU(page)
  const play = stage.getByTestId('shader-mode-play')
  const phase = stage.getByRole('slider', { name: 'Animation phase' })

  if (!webgpu) {
    // Without WebGPU the paint's still frame shows, and there is nothing to play.
    await expect(stage.getByTestId('shader-mode-unavailable')).toBeVisible()
    await expect(play).toBeDisabled()
    return
  }

  await expect(stage.getByTestId('shader-mode-preview')).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000
  })
  // It plays as it opens unless animations are off, which leaves it paused.
  if ((await play.getAttribute('aria-label')) === 'Pause') await play.click()
  await expect(play).toHaveAccessibleName('Play')
  const paused = await phase.getAttribute('aria-valuenow')
  await afterFrames(page, 10)
  expect(await phase.getAttribute('aria-valuenow')).toBe(paused)

  await phase.focus()
  await page.keyboard.press('End')
  await expect(phase).toHaveAttribute('aria-valuenow', '10')
  await page.keyboard.press('Home')
  await expect(phase).toHaveAttribute('aria-valuenow', '0')

  // Space plays from where the scrubber rests.
  await stage.focus()
  await page.keyboard.press('Space')
  await expect(play).toHaveAccessibleName('Pause')
  await expect
    .poll(async () => Number(await phase.getAttribute('aria-valuenow')))
    .toBeGreaterThan(0)
  ctx.canvas.assertNoErrors()
})

test('a read-only document plays its shader but keeps its settings', async () => {
  const page = ctx.page
  const stage = await openShaderMode(page)
  await page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    store.setReadOnly(true)
  })
  const settings = stage.getByRole('complementary', { name: 'Shader settings' })
  await expect(settings.getByRole('status')).toBeVisible()
  await expect(settings.getByRole('radio', { name: 'Sunset' })).toBeHidden()
  await page.evaluate(() => window.openPencil?.getStore?.()?.setReadOnly(false))
})

test('its keys move the animation, never the layer', async () => {
  const page = ctx.page
  const stage = await openShaderMode(page)
  const phase = stage.getByRole('slider', { name: 'Animation phase' })
  const layer = await selectedLayer(page)
  expect(layer.id).not.toBeNull()

  const time = async () => Number(await phase.getAttribute('aria-valuenow'))

  // A step pauses the clock first, so the times below stay put.
  await stage.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Home')
  await expect.poll(time).toBe(0)
  await page.keyboard.press('ArrowRight')
  await expect.poll(time).toBeCloseTo(0.1)
  await page.keyboard.press('Shift+ArrowRight')
  await expect.poll(time).toBeCloseTo(1.1)
  await page.keyboard.press('ArrowLeft')
  await expect.poll(time).toBeCloseTo(1)
  for (const key of ['ArrowUp', 'ArrowDown', 'Shift+ArrowUp', 'Shift+ArrowLeft']) {
    await page.keyboard.press(key)
  }
  // Arrow keys on the scrubber step it rather than the layer too.
  await phase.focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowUp')
  expect(await selectedLayer(page)).toEqual(layer)

  // Neither does cut or paste: the layer and Shader Mode stay.
  await page.evaluate(() => {
    window.dispatchEvent(new ClipboardEvent('cut', { bubbles: true, cancelable: true }))
    window.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true }))
  })
  await expect(stage).toBeVisible()
  expect(await selectedLayer(page)).toEqual(layer)

  // K plays or pauses, as Space does.
  const play = stage.getByTestId('shader-mode-play')
  const label = await play.getAttribute('aria-label')
  await stage.focus()
  await page.keyboard.press('KeyK')
  await expect(play).not.toHaveAccessibleName(label ?? '')
  ctx.canvas.assertNoErrors()
})

test('pressing the scrubber without moving it keeps a playing shader playing', async () => {
  const page = ctx.page
  const stage = await openShaderMode(page)
  test.skip(!(await hasWebGPU(page)), 'Shaders play only with WebGPU')
  await expect(stage.getByTestId('shader-mode-preview')).toHaveAttribute('data-status', 'ready', {
    timeout: 15_000
  })
  const play = stage.getByTestId('shader-mode-play')
  if ((await play.getAttribute('aria-label')) === 'Play') await play.click()
  await expect(play).toHaveAccessibleName('Pause')

  const thumb = stage.getByRole('slider', { name: 'Animation phase' })
  const box = await thumb.boundingBox()
  if (!box) throw new Error('The scrubber has no thumb on screen')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await expect(play).toHaveAccessibleName('Play')
  await page.mouse.up()
  await expect(play).toHaveAccessibleName('Pause')
  ctx.canvas.assertNoErrors()
})
