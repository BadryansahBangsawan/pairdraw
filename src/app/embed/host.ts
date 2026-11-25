import type { SceneNode } from '@pairdraw/scene-graph'

import type { EmbedDocumentFormat, EmbedEventMessage, EmbedImageFormat } from './protocol'

type EmbedPage = Pick<SceneNode, 'id' | 'name'>

interface EmbedImage {
  data: Uint8Array
  mimeType: string
}

/**
 * The editor as an embed session drives it, injected so the protocol is tested without a canvas.
 * Methods throw `EmbedRequestError` for failures the host can act on.
 */
export interface EmbedEditorHost {
  /**
   * Opens a document in place of the one shown, after any load still running; it takes the
   * editability `setEditable` last gave.
   */
  load(name: string, data: Uint8Array): Promise<{ name: string }>
  /** The shown document as the format asked for: a `.fig` file unless `pen` names text. */
  getDocument(
    format?: EmbedDocumentFormat
  ): Promise<{ name: string; data: Uint8Array; warnings?: string[] }>
  getPages(): { pages: EmbedPage[]; currentPageId: string }
  setPage(pageId: string): Promise<void>
  getSelection(): string[]
  /** Selects the layers that exist on the current page and returns those it selected. */
  select(nodeIds: string[]): string[]
  zoomToFit(): void
  exportImage(
    nodeIds: string[] | undefined,
    format: EmbedImageFormat,
    scale: number
  ): Promise<EmbedImage>
  setEditable(editable: boolean): void
  /** Calls back with the shown document's events until the returned function is called. */
  subscribe(listener: (event: EmbedEventMessage) => void): () => void
  /** Stops holding shown documents to the embed's editability. */
  dispose(): void
}
