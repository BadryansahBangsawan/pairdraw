import { nextTick } from 'vue'

/** The canvas of the pane being worked in, or the first one. */
function activeCanvas(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(
      '[data-active-pane="true"] [data-test-id="canvas-element"]'
    ) ?? document.querySelector<HTMLElement>('[data-test-id="canvas-element"]')
  )
}

/** The swatch that opens the picker for the shader paint drawn as `image`, if it shows. */
function shaderSwatch(image: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-test-id="fill-picker-swatch"][data-shader-image="${CSS.escape(image)}"]`
  )
}

/**
 * Gives focus back to the editor once Shader Mode has gone and the editor is back on screen.
 * The button that opened Shader Mode went with the editor, so its paint's swatch takes focus,
 * or the canvas when that paint is gone. Something focused meanwhile keeps focus.
 */
export function restoreShaderModeFocus(image: string | null): void {
  void nextTick(() =>
    requestAnimationFrame(() => {
      const active = document.activeElement
      if (active instanceof HTMLElement && active !== document.body) return
      const target = (image ? shaderSwatch(image) : null) ?? activeCanvas()
      target?.focus({ preventScroll: true })
    })
  )
}
