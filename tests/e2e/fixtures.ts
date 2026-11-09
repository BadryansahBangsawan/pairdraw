import { test, expect, type Locator, type Page } from '@playwright/test'

import { CanvasHelper } from '#tests/helpers/canvas'

export function useEditorSetup(url = '/?test') {
  let page: Page
  let canvas: CanvasHelper

  test.describe.configure({ mode: 'serial' })

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage()
    await page.goto(url)
    canvas = new CanvasHelper(page)
    await canvas.waitForInit()
  })

  test.afterAll(async () => {
    if (page) await page.close()
  })

  return {
    get page() {
      return page
    },
    get canvas() {
      return canvas
    }
  }
}

/**
 * A fresh page, in its own browser context, for every test. Use it instead of reloading one shared
 * page before each test: Chromium's renderer process accumulates state across reloads of the same
 * editor page and crashes after roughly a dozen of them, which a new context per test avoids.
 */
export function useFreshEditor(url = '/?test') {
  let page: Page | undefined
  let canvas: CanvasHelper | undefined

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    await page.goto(url)
    canvas = new CanvasHelper(page)
    await canvas.waitForInit()
  })

  test.afterEach(async () => {
    await page?.close()
    page = undefined
    canvas = undefined
  })

  return {
    get page() {
      if (!page) throw new Error('useFreshEditor: the page exists only inside a test')
      return page
    },
    get canvas() {
      if (!canvas) throw new Error('useFreshEditor: the canvas exists only inside a test')
      return canvas
    }
  }
}

export function useEditorSetupWithClear(url = '/?test') {
  const ctx = useEditorSetup(url)

  test.beforeEach(async () => {
    await ctx.canvas.clearCanvas()
  })

  return ctx
}

export async function expectInViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('Expected visible element to have a bounding box')

  const viewport = page.viewportSize()
  if (!viewport) throw new Error('Expected page to have a viewport')

  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
}

export { test, expect }
