import { expect, type Page } from '@playwright/test'

import type * as BlendScenes from '#tests/helpers/canvas/blend/scene'
import type * as MaskScenes from '#tests/helpers/canvas/masks/scene'

/** The page the specimen gets, so the demo's own content never enters the snapshot. */
const SPECIMEN_PAGE_NAME = 'Paint effects'
/** The mask rows sit below the blend rows, clear of the blend scene's lowest shadow. */
const MASK_ROW_OFFSET = 340

/** Exercise the P3 surface negotiation even on an sRGB CI display. */
export async function emulateWideGamutDisplay(page: Page) {
  await page.addInitScript(() => {
    const matchMedia = window.matchMedia.bind(window)
    window.matchMedia = (query) => {
      const result = matchMedia(query)
      if (query === '(color-gamut: p3)') Object.defineProperty(result, 'matches', { value: true })
      return result
    }
  })
}

/** The wide-gamut notice is the only capability banner whose content names Display-P3. */
export function wideGamutBanner(page: Page) {
  return page.getByRole('status').filter({ hasText: 'Display-P3' })
}

/**
 * Keep the wide-gamut notice from resizing the canvas in rendering-fidelity tests. A P3 document on
 * an engine without a float drawing buffer always gets the notice, so wait for it: a best-effort
 * click leaves the banner's row in place and the snapshot 40 px short.
 */
export async function dismissWideGamutBanner(page: Page) {
  const banner = wideGamutBanner(page)
  const canvas = page.getByTestId('scene-canvas-element')
  const canvasHeight = () => canvas.evaluate((element: HTMLCanvasElement) => element.clientHeight)
  await banner.waitFor({ state: 'visible', timeout: 30_000 })
  const before = await canvasHeight()
  await banner.locator('[data-slot="banner-dismiss"]').click()
  await banner.waitFor({ state: 'hidden' })
  // The notice's row goes back to the canvas. A size read that only compares the canvas with
  // itself can pass on the old height and leave the snapshot that row short.
  await expect.poll(canvasHeight, { timeout: 30_000 }).toBeGreaterThan(before)
}

/**
 * Focus a page of blends and masks. The demo used to carry specimen pages for them; the tour that
 * replaced it does not, so the helper builds the specimen from the canvas test scenes instead.
 */
export async function focusPaintEffects(page: Page) {
  // Zooming to a layer uses the viewport size the canvas last measured, so a window resize must
  // reach it first or the zoom fits the old size. The canvas sizes its pixels in the same step.
  await page.waitForFunction(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      '[data-test-id="scene-canvas-element"]'
    )
    const dpr = window.devicePixelRatio || 1
    return (
      !!canvas &&
      canvas.width === Math.round(canvas.clientWidth * dpr) &&
      canvas.height === Math.round(canvas.clientHeight * dpr)
    )
  })
  await page.evaluate(
    async ({ pageName, maskOffset }) => {
      const store = window.pairdraw?.getStore?.()
      if (!store) throw new Error('Editor unavailable')
      store.setDocumentColorSpace('display-p3')
      const existing = store.graph.getPages().find((candidate) => candidate.name === pageName)
      const page = existing ?? store.graph.addPage(pageName)
      if (store.state.currentPageId !== page.id) await store.switchPage(page.id)
      if (store.graph.getChildren(page.id).length > 0) return

      // Test helpers are browser modules here, so their URLs resolve when the page runs them.
      const blendURL = '/tests/helpers/canvas/blend/scene.ts'
      const masksURL = '/tests/helpers/canvas/masks/scene.ts'
      const blend: typeof BlendScenes = await import(blendURL)
      const masks: typeof MaskScenes = await import(masksURL)
      blend.createLinearBlendScene(store.graph, page.id)
      const blended = new Set(store.graph.getChildren(page.id).map((node) => node.id))
      masks.createMaskEffectsScene(store.graph, page.id)
      for (const node of store.graph.getChildren(page.id)) {
        if (blended.has(node.id)) continue
        store.graph.updateNode(node.id, { y: node.y + maskOffset })
      }
      store.requestRender()
    },
    { pageName: SPECIMEN_PAGE_NAME, maskOffset: MASK_ROW_OFFSET }
  )
  await page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Editor unavailable')
    const subject = store.graph.getChildren(store.state.currentPageId)
    if (subject.length === 0) throw new Error('Paint effects page is empty')
    store.select(subject.map((node) => node.id))
    store.zoomToSelection()
    store.clearSelection()
  })
}

export async function waitForSettledScene(page: Page) {
  await page.waitForFunction(() => {
    const store = window.pairdraw?.getStore?.()
    const renderer = store?.canvasRenderers.find((r) => r.tracksSceneSettlement)
    return (
      store?.state.navigation.phase === 'idle' &&
      renderer &&
      !renderer.sceneBackingNeedsCrispRender &&
      !renderer.sceneBackingBuild
    )
  })
}

export async function sceneBufferState(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      '[data-test-id="scene-canvas-element"]'
    )
    const gl = canvas?.getContext('webgl2')
    if (!gl) throw new Error('Scene WebGL context unavailable')
    return {
      colorSpace: gl.drawingBufferColorSpace,
      documentColorSpace: window.pairdraw?.getStore?.().graph.documentColorSpace,
      error: gl.getError()
    }
  })
}
