import type { Page } from '@playwright/test'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

// A fill can draw code the user writes. The code view replaces the gallery, the canvas draws the
// new code once applied, and the inputs the code declares are edited as one undo step each.

const ctx = useEditorSetupWithClear()

const RED = `/** @resolution */
uniform vec2 u_resolution;
void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`

const GREEN_WITH_STRENGTH = `/**
 * @label Strength
 * @default 0
 */
uniform float u_strength;
void main() {
  gl_FragColor = vec4(0.0, u_strength, 0.0, 1.0);
}`

/** The shader a layer's first fill draws, as the document stores it. */
function firstShader(page: Page) {
  return page.evaluate(() => {
    const store = window.openPencil?.getStore?.()
    if (!store) throw new Error('OpenPencil store not initialized')
    const id = [...store.state.selectedIds][0]
    const node = id ? store.graph.getNode(id) : undefined
    const item = (node?.pluginData ?? []).find((entry) => entry.key === 'shader')
    const value: unknown = item ? JSON.parse(item.value) : null
    if (typeof value !== 'object' || value === null) return null
    return value as { source?: string; uniforms?: Record<string, unknown> }
  })
}

/** Draws a rectangle and opens its fill on the shader tab. */
async function openShaderFill(page: Page) {
  await ctx.canvas.drawRect(160, 160, 240, 160)
  await page.getByTestId('fill-picker-swatch').first().click()
  await page.getByTestId('fill-picker-tab-shader').click()
  await expect(page.getByTestId('shader-gallery')).toBeVisible()
}

/** Types `source` into the code view and applies it. */
async function writeShader(page: Page, source: string) {
  await page.getByTestId('shader-code-toggle').click()
  await page.getByTestId('shader-code').fill(source)
  await page.getByTestId('shader-code-apply').click()
}

test('code the user writes replaces the preset and the canvas draws it', async () => {
  const page = ctx.page
  await openShaderFill(page)
  await writeShader(page, RED)

  await expect.poll(async () => (await firstShader(page))?.source).toBe(RED)
  // The paint stores no preset once it draws code, and the code view stays open, without a
  // second apply to offer.
  await expect(page.getByTestId('shader-code-apply')).toBeDisabled()
  await expect(page.getByTestId('shader-code-error')).toHaveCount(0)
  ctx.canvas.assertNoErrors()
})

test('the inputs the code declares are edited and undo one step at a time', async () => {
  const page = ctx.page
  await openShaderFill(page)
  await writeShader(page, GREEN_WITH_STRENGTH)

  const uniforms = page.getByTestId('shader-uniforms')
  await expect(uniforms).toBeVisible()
  const strength = uniforms.getByRole('spinbutton').first()
  await strength.click()
  await page.keyboard.type('0.4')
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await firstShader(page))?.uniforms?.u_strength).toBe(0.4)

  await page.keyboard.press('Escape')
  await ctx.canvas.undo()
  await expect.poll(async () => (await firstShader(page))?.uniforms?.u_strength).toBeUndefined()

  ctx.canvas.assertNoErrors()
})

test('code that does not compile is kept with the error it reports', async () => {
  const page = ctx.page
  await openShaderFill(page)
  await writeShader(page, RED)
  await page.getByTestId('shader-code').fill('void main() { gl_FragColor = nope; }')
  await page.getByTestId('shader-code-apply').click()

  await expect(page.getByTestId('shader-code-error')).toBeVisible()
  // The code is kept so it can still be fixed; the canvas keeps its last frame that compiled.
  await expect.poll(async () => (await firstShader(page))?.source).toContain('nope')
  ctx.canvas.assertNoErrors()
})
test('the canvas draws the solid colour the user code returns', async () => {
  const page = ctx.page
  await openShaderFill(page)
  await writeShader(page, RED)
  await expect.poll(async () => (await firstShader(page))?.source).toBe(RED)
  await page.keyboard.press('Escape')
  await ctx.canvas.waitForRender()

  // SkSL under CanvasKit fills the layer with the exact colour the code returns, so the frame is
  // the same on every machine that draws it.
  await expect(await ctx.canvas.screenshotCanvasRegion(400, 300)).toMatchSnapshot(
    'user-shader-fill.png'
  )
  ctx.canvas.assertNoErrors()
})
