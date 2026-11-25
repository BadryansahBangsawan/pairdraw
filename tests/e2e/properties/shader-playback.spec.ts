import type { Page } from '@playwright/test'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

// Preview plays a shader only while a layer painting it is on screen. A page of twenty shader
// layers starts players for the two in view, keeps the rest as still frames, and stops drawing
// when the view leaves them; a shader that never changes needs no player at all.

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

function playback(page: Page) {
  return page.evaluate(() => window.pairdraw?.test?.shaderPlayback?.() ?? null)
}

/** Resolves after `count` animation frames, in which a playing shader would draw more. */
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

/** Twenty shader layers, two on screen and eighteen far below, plus one still shader on screen. */
async function twentyShaders(page: Page) {
  await page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const pageId = store.state.currentPageId
    const filling = (name: string, x: number, y: number) => {
      const node = store.graph.createNode('RECTANGLE', pageId, {
        name,
        x,
        y,
        width: 160,
        height: 120,
        fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, visible: true, opacity: 1 }]
      })
      return node.id
    }
    const animated = []
    for (let index = 0; index < 20; index++) {
      const onScreen = index < 2
      animated.push(
        filling(`Shader ${index}`, onScreen ? index * 200 : 0, onScreen ? 0 : 10_000 + index * 200)
      )
    }
    store.setShaderPaint(animated, 'fills', 0, { components: [{ type: 'Aurora' }] })
    const still = filling('Paper', 400, 0)
    store.setShaderPaint([still], 'fills', 0, {
      components: [{ type: 'SolidColor', props: { color: '#efe7d8' } }, { type: 'Paper' }]
    })
    store.state.panX = 0
    store.state.panY = 0
    store.state.zoom = 1
    store.startPlay()
  })
}

test('a page of twenty shaders plays only the ones on screen', async () => {
  const page = ctx.page
  test.skip(!(await hasWebGPU(page)), 'WebGPU plays shaders')
  await twentyShaders(page)

  await expect.poll(async () => (await playback(page))?.visible).toBe(2)
  const playing = await playback(page)
  // The eighteen below never start a player, and the still shader on screen needs none.
  expect(playing?.players).toBeLessThanOrEqual(2)
  expect(playing?.players).toBeLessThanOrEqual(16)
  expect(playing?.running).toBe(true)

  const before = (await playback(page))?.frames ?? 0
  await expect.poll(async () => (await playback(page))?.frames ?? 0).toBeGreaterThan(before)
})

test('moving the view away from every shader stops the frame loop', async () => {
  const page = ctx.page
  test.skip(!(await hasWebGPU(page)), 'WebGPU plays shaders')
  await twentyShaders(page)
  await expect.poll(async () => (await playback(page))?.visible).toBe(2)

  await page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    store.state.panY = -1_000_000
    store.requestRepaint()
  })
  await expect.poll(async () => (await playback(page))?.visible, { timeout: 5000 }).toBe(0)
  const stopped = await playback(page)
  expect(stopped?.running).toBe(false)

  const frames = stopped?.frames ?? 0
  await afterFrames(page, 6)
  expect((await playback(page))?.frames).toBe(frames)
  ctx.canvas.assertNoErrors()
})
