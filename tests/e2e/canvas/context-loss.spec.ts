import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { loseWebGLContext } from '#tests/helpers/canvas/context-loss'

const editor = useEditorSetupWithClear('/?test')

test('the canvas draws again after the browser takes its WebGL context', async () => {
  const { page, canvas } = editor
  await canvas.waitForInit()

  await page.keyboard.press('R')
  await canvas.drawRect(160, 140, 240, 160)
  await canvas.waitForRender()

  const scene = page.getByTestId('scene-canvas-element')
  await expect(scene).toHaveScreenshot('before-loss.png')

  await loseWebGLContext(scene)

  // The browser may never give the lost context back, so the app replaces the canvas and draws
  // the same frame again, selection included.
  // Selection handles are a small part of the canvas, so the project-wide ratio would
  // accept a frame that dropped them.
  await expect(scene).toHaveScreenshot('before-loss.png', {
    timeout: 15_000,
    maxDiffPixelRatio: 0.001
  })
  canvas.assertNoErrors()
})
