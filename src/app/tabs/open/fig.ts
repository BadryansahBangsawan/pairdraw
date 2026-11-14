import { figThumbnailPageId, populateFigPage } from '@pairdraw/core/io/formats/fig'
import { computeAllLayouts } from '@pairdraw/core/layout'
import type { SceneGraph } from '@pairdraw/scene-graph'

import { readFigDocument } from '@/app/document/io/fig'

/** A `.fig` file named after its document, holding a copy of the bytes. */
export function figFile(bytes: Uint8Array, name: string): File {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new File([copy.buffer], `${name}.fig`, { type: 'application/octet-stream' })
}

/** Reads a `.fig` file as a tab opens it: its first page and its cover page laid out. */
export async function readFigForTab(file: File, signal?: AbortSignal): Promise<SceneGraph> {
  const imported = await readFigDocument(file, signal)
  const firstPageId = imported.getPages()[0]?.id
  const layOut = (pageId: string) =>
    imported.applyDerivedLayoutDuring(() => computeAllLayouts(imported, pageId))
  if (firstPageId) layOut(firstPageId)
  const thumbnailPageId = figThumbnailPageId(imported.getPages())
  if (thumbnailPageId && thumbnailPageId !== firstPageId) {
    populateFigPage(imported, thumbnailPageId)
    layOut(thumbnailPageId)
  }
  return imported
}
