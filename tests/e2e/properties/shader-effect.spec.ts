import type { Page } from '@playwright/test'

import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'

// A layer can run code over itself. The effect editor takes GLSL, the canvas redraws the layer
// through it, and the frame it drew is the same on every machine.

const ctx = useEditorSetupWithClear()

const SOLID = `void main() {
  gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
}`

/** The layer's shader effect, as the document stores it. */
function shaderEffect(page: Page) {
  return page.evaluate(() => {
    const store = window.pairdraw?.getStore?.()
    if (!store) throw new Error('Pairdraw store not initialized')
    const id = [...store.state.selectedIds][0]
    const effect = id ? store.graph.getNode(id)?.effects[0] : undefined
    if (!effect || effect.type !== 'SHADER') return null
    return { source: effect.source, visible: effect.visible }
  })
}

/** Draws a rectangle, selects it, and opens the effects panel on the shader effect it adds. */
async function openShaderEffect(page: Page) {
  await ctx.canvas.drawRect(160, 160, 240, 160)
  const section = page.getByRole('region', { name: 'Effects', exact: true })
  await section.getByRole('button', { name: 'Add effect' }).click()
  await section.getByRole('button', { name: 'Expand effect settings' }).click()
  await section.getByRole('combobox', { name: 'Effects', exact: true }).click()
  await page.getByRole('option', { name: 'Shader', exact: true }).click()
  await expect(section.getByTestId('effect-shader-code')).toBeVisible()
  return section
}

test('adding a shader effect keeps its code on the layer', async () => {
  const page = ctx.page
  await openShaderEffect(page)
  await expect.poll(async () => (await shaderEffect(page))?.visible).toBe(true)
  // The default code compiles, so the editor shows no error before anything is typed.
  await expect(page.getByTestId('effect-shader-code-error')).toHaveCount(0)
  ctx.canvas.assertNoErrors()
})

test('the layer draws the code written in the effect editor', async () => {
  const page = ctx.page
  const section = await openShaderEffect(page)
  const code = section.getByTestId('effect-shader-code')
  await code.fill(SOLID)
  await code.blur()

  await expect.poll(async () => (await shaderEffect(page))?.source).toBe(SOLID)
  await page.keyboard.press('Escape')
  await ctx.canvas.waitForRender()

  // SkSL under CanvasKit paints the layer with the exact colour the code returns, so the frame is
  // the same everywhere it is drawn.
  await expect(await ctx.canvas.screenshotCanvasRegion(400, 300)).toMatchSnapshot(
    'shader-effect.png'
  )
  ctx.canvas.assertNoErrors()
})

test('code that does not compile reports why and the layer draws its own content', async () => {
  const page = ctx.page
  const section = await openShaderEffect(page)
  const code = section.getByTestId('effect-shader-code')
  await code.fill(SOLID)
  await code.blur()
  await expect.poll(async () => (await shaderEffect(page))?.source).toBe(SOLID)

  await code.fill('void main() { gl_FragColor = nope; }')
  await code.blur()

  await expect(section.getByTestId('effect-shader-code-error')).toBeVisible()
  // A broken effect is skipped, so the frame is the layer's own content, not the green it drew.
  await page.keyboard.press('Escape')
  await ctx.canvas.waitForRender()
  await expect(await ctx.canvas.screenshotCanvasRegion(400, 300)).toMatchSnapshot(
    'shader-effect-broken.png'
  )
  ctx.canvas.assertNoErrors()
})
