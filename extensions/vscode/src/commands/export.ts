import type * as vscode from 'vscode'

import type { EmbedImageFormat } from '../embed/protocol'
import type { EditorSession } from '../fig/session'
import type { ExtensionHost } from '../host'

/** The file extension an export writes, from the MIME type the editor reported. */
export function fileExtensionForMimeType(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/webp') return 'webp'
  return 'png'
}

/** `drawing.fig` as `drawing.png`: the export replaces the document's own extension. */
export function exportFileName(path: string, extension: string): string {
  const slash = path.lastIndexOf('/')
  const dot = path.lastIndexOf('.')
  const stem = dot > slash ? path.slice(0, dot) : path
  return `${stem}.${extension}`
}

/**
 * Exports the layers the editor has selected to a PNG the user picks. The editor answers with the
 * bytes, so the extension never renders or parses a document.
 */
export async function exportSelection(
  session: EditorSession,
  documentURI: vscode.Uri,
  host: ExtensionHost,
  format: EmbedImageFormat = 'PNG'
): Promise<void> {
  const image = await session.exportSelection({ format })
  const extension = fileExtensionForMimeType(image.mimeType)
  const destination = await host.saveDialog({
    saveLabel: 'Export',
    defaultUri: documentURI.with({ path: exportFileName(documentURI.path, extension) }),
    filters: { Image: [extension] }
  })
  if (!destination) return
  await host.writeFile(destination, image.data)
}
