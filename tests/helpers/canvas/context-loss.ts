import type { Locator } from '@playwright/test'

/**
 * Drops the WebGL context of a canvas the test can already see, the way a GPU reset does.
 * The browser keeps that context lost until something asks for it back.
 */
export async function loseWebGLContext(canvas: Locator): Promise<void> {
  await canvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) {
      throw new TypeError('The canvas element is missing')
    }
    const gl2 = element.getContext('webgl2')
    const gl1 = gl2 instanceof WebGL2RenderingContext ? null : element.getContext('webgl')
    const gl = gl2 instanceof WebGL2RenderingContext ? gl2 : gl1
    if (!(gl instanceof WebGL2RenderingContext) && !(gl instanceof WebGLRenderingContext)) {
      throw new TypeError('The canvas has no WebGL context')
    }
    const extension = gl.getExtension('WEBGL_lose_context')
    if (!extension) throw new Error('WEBGL_lose_context is unavailable')
    extension.loseContext()
  })
}
