import type { Editor } from '@open-pencil/core'

/**
 * Puts a browser screenshot on the canvas. The bytes are a PNG the window captured; placing them
 * is the image paste the editor already uses.
 */
export async function placeBrowserScreenshot(
  editor: Pick<Editor, 'placeImageFiles'>,
  png: Uint8Array,
  name: string
): Promise<void> {
  if (png.byteLength < 8) throw new Error('The page returned no picture')
  const file = new File([png.slice()], `${name}.png`, { type: 'image/png' })
  await editor.placeImageFiles([file], 0, 0)
}
