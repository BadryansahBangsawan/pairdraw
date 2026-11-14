import type { Page, Locator } from '@playwright/test'

import type { Vector } from '@pairdraw/scene-graph/primitives'

import { OFFICIAL_CLOUD_URL } from '@/constants'

/**
 * A build that names an official Cloud server asks it whether Cloud is open yet and carries on
 * without an answer, so a request to it that fails is the network's, not the app's.
 */
const OFFICIAL_CLOUD_ORIGIN = OFFICIAL_CLOUD_URL ? new URL(OFFICIAL_CLOUD_URL).origin : null

/** The app binds `$mod` to Meta on macOS and to Control elsewhere. */
const PRIMARY_MODIFIER = process.platform === 'darwin' ? 'Meta' : 'Control'

export class CanvasHelper {
  readonly page: Page
  readonly canvas: Locator
  readonly errors: string[] = []

  constructor(page: Page) {
    this.page = page
    this.canvas = page.getByTestId('canvas-area')
    page.on('pageerror', (err) => this.errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      if (OFFICIAL_CLOUD_ORIGIN && msg.location().url.startsWith(OFFICIAL_CLOUD_ORIGIN)) return
      this.errors.push(msg.text())
    })
  }

  assertNoErrors() {
    if (this.errors.length > 0) {
      const messages = this.errors.join('\n')
      this.errors.length = 0
      throw new Error(`Browser errors:\n${messages}`)
    }
  }

  async waitForRender() {
    await this.page.evaluate(() => new Promise(requestAnimationFrame))
  }

  async waitForInit() {
    await this.page
      .getByTestId('canvas-element')
      .and(this.page.locator('[data-ready="1"]'))
      .waitFor({ timeout: 30000 })
    await this.page.getByTestId('canvas-loading').waitFor({ state: 'hidden', timeout: 30000 })
    await this.page.locator('#loader').waitFor({ state: 'detached', timeout: 30000 })
    await this.useLightPage()
  }

  /**
   * Canvas specs draw on Figma's light page. Playwright runs the app in its dark theme, where a new
   * document starts on Figma's dark page, so a fresh document (one empty page on that exact
   * background) is switched back; any other document keeps its own. The switch is setup, not an
   * edit, so the document stays saved and closing it asks nothing.
   * `tests/e2e/pages/theme-background.spec.ts` covers the theme.
   */
  async useLightPage() {
    await this.page.evaluate(() => {
      const store = window.pairdraw?.getStore?.()
      if (!store) return
      const pages = store.graph.getPages()
      const [first] = pages
      const darkDefault = 0x1e / 255
      const { r, g, b } = store.state.pageColor
      const fresh =
        pages.length === 1 &&
        first.childIds.length === 0 &&
        [r, g, b].every((c) => c === darkDefault)
      if (!fresh) return
      store.setPageColor({ r: 0.96, g: 0.96, b: 0.96, a: 1 })
      store.markDocumentSaved()
    })
  }

  async clearCanvas() {
    // Inside path editing, Select All and Backspace act on the path's points, not the layers.
    await this.pressKey('Escape')
    await this.selectAll()
    await this.pressKey('Backspace')
    await this.waitForRender()
  }

  async pasteSVG(markup: string, x: number, y: number) {
    return this.page.evaluate(
      async ({ markup, x, y }) => {
        const store = window.pairdraw?.getStore?.()
        if (!store) throw new Error('Pairdraw store not initialized')
        const pasted = await store.pasteSVG(markup, x, y)
        store.clearSelection()
        store.requestRender()
        return pasted
      },
      { markup, x, y }
    )
  }

  /** The canvas with what floats over it, such as the toolbar, once its transitions have ended. */
  async screenshotCanvas() {
    return this.canvas.screenshot({ animations: 'disabled' })
  }

  async screenshotCanvasRegion(width = 900, height = 700) {
    const box = await this.canvas.boundingBox()
    if (!box) throw new Error('Canvas has no bounding box — is it visible?')
    const viewport = this.page.viewportSize()
    if (!viewport) throw new Error('Viewport unavailable')
    return this.page.screenshot({
      // The toolbar over the canvas fades between tools; a snapshot shows where it settles.
      animations: 'disabled',
      clip: {
        x: box.x,
        y: box.y,
        width: Math.min(width, viewport.width - box.x),
        height: Math.min(height, viewport.height - box.y)
      }
    })
  }

  /**
   * The page point the canvas's pointer coordinates count from, at the nearest whole page pixel.
   * Mouse events carry whole pixels and drop a fraction, so from a canvas edge between pixels a
   * point would land up to a pixel short; from here it lands within half a pixel of it.
   */
  async pointerOrigin(): Promise<Vector> {
    const b = await this.canvas.boundingBox()
    if (!b) throw new Error('Canvas has no bounding box — is it visible?')
    return { x: Math.round(b.x), y: Math.round(b.y) }
  }

  async click(canvasX: number, canvasY: number) {
    const box = await this.pointerOrigin()
    await this.page.mouse.click(box.x + canvasX, box.y + canvasY)
  }

  async drag(fromX: number, fromY: number, toX: number, toY: number, steps = 10) {
    const box = await this.pointerOrigin()
    await this.page.mouse.move(box.x + fromX, box.y + fromY)
    await this.page.mouse.down()
    await this.page.mouse.move(box.x + toX, box.y + toY, { steps })
    await this.page.mouse.up()
  }

  async pressKey(key: string) {
    await this.page.keyboard.press(key.replace(/^Meta\+/, `${PRIMARY_MODIFIER}+`))
  }

  async drawRect(x: number, y: number, width: number, height: number) {
    await this.pressKey('r')
    await this.drag(x, y, x + width, y + height)
    await this.waitForRender()
  }

  async drawEllipse(x: number, y: number, width: number, height: number) {
    await this.pressKey('o')
    await this.drag(x, y, x + width, y + height)
    await this.waitForRender()
  }

  async drawSection(x: number, y: number, width: number, height: number) {
    await this.pressKey('Shift+KeyS')
    await this.drag(x, y, x + width, y + height)
    await this.waitForRender()
  }

  async selectTool(
    tool: 'select' | 'frame' | 'section' | 'rectangle' | 'ellipse' | 'text' | 'pen' | 'hand'
  ) {
    const keys: Record<string, string> = {
      select: 'v',
      frame: 'f',
      section: 'Shift+KeyS',
      rectangle: 'r',
      ellipse: 'o',
      text: 't',
      pen: 'p',
      hand: 'h'
    }
    await this.pressKey(keys[tool])
  }

  async deleteSelection() {
    await this.pressKey('Backspace')
    await this.waitForRender()
  }

  async undo() {
    await this.pressKey('Meta+z')
    await this.waitForRender()
  }

  async redo() {
    await this.pressKey('Meta+Shift+z')
    await this.waitForRender()
  }

  async selectAll() {
    await this.pressKey('Meta+a')
  }

  async duplicate() {
    await this.pressKey('Meta+d')
    await this.waitForRender()
  }

  async marquee(x1: number, y1: number, x2: number, y2: number, steps = 10) {
    const box = await this.pointerOrigin()
    await this.page.mouse.move(box.x + x1, box.y + y1)
    await this.page.mouse.down()
    await this.page.mouse.move(box.x + x2, box.y + y2, { steps })
    await this.page.mouse.up()
    await this.waitForRender()
  }

  async hover(x: number, y: number) {
    const box = await this.pointerOrigin()
    await this.page.mouse.move(box.x + x, box.y + y)
    await this.waitForRender()
  }

  /** Point `locator` at the outer NumberField container, not the inner `<input>`. */
  async dragNumberField(locator: Locator, deltaX: number) {
    await locator.scrollIntoViewIfNeeded()
    const box = await locator.boundingBox()
    if (!box) throw new Error('dragNumberField: element has no bounding box')
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    await this.page.mouse.move(cx, cy)
    await this.page.mouse.down()
    await this.page.mouse.move(cx + deltaX, cy, { steps: 10 })
    await this.page.mouse.up()
    await this.waitForRender()
  }

  async altDrag(fromX: number, fromY: number, toX: number, toY: number) {
    const box = await this.pointerOrigin()
    await this.page.keyboard.down('Alt')
    await this.page.mouse.move(box.x + fromX, box.y + fromY)
    await this.page.mouse.down()
    await this.page.mouse.move(box.x + toX, box.y + toY, { steps: 10 })
    await this.page.mouse.up()
    await this.page.keyboard.up('Alt')
    await this.waitForRender()
  }

  async shiftDrag(fromX: number, fromY: number, toX: number, toY: number) {
    const box = await this.pointerOrigin()
    await this.page.keyboard.down('Shift')
    await this.page.mouse.move(box.x + fromX, box.y + fromY)
    await this.page.mouse.down()
    await this.page.mouse.move(box.x + toX, box.y + toY, { steps: 10 })
    await this.page.mouse.up()
    await this.page.keyboard.up('Shift')
    await this.waitForRender()
  }

  async dblclick(x: number, y: number) {
    const box = await this.pointerOrigin()
    await this.page.mouse.dblclick(box.x + x, box.y + y)
    await this.waitForRender()
  }
}
