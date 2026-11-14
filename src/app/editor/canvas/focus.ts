/** The canvas of the pane being worked in, or the first one. */
export function activeCanvasElement(): HTMLCanvasElement | null {
  return (
    document.querySelector<HTMLCanvasElement>(
      '[data-active-pane="true"] [data-test-id="canvas-element"]'
    ) ?? document.querySelector<HTMLCanvasElement>('[data-test-id="canvas-element"]')
  )
}
