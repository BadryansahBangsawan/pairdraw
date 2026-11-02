import type { Editor, EditorState } from '@open-pencil/core'
import type { BuiltinIOFormatId, ExportRequest, IORegistry } from '@open-pencil/core/io'

import {
  bundleExportFiles,
  createExportNameClaimer,
  createExportTargetActions,
  getExportBaseName,
  getExportBytes,
  getExportFileName,
  getExportOptions,
  saveExportedFile,
  type ExportedFile
} from '@/app/document/export/files'
import type { ExportOptions } from '@/app/document/export/types'
import { trackDocumentFormat } from '@/app/telemetry'

type DownloadBlob = (data: Uint8Array, filename: string, mime: string) => void

export interface ExportTargetRequest {
  target: ExportRequest['target']
  formatId: string
  options?: ExportOptions
}

export function createDocumentExportActions(
  editor: Editor,
  state: EditorState,
  io: IORegistry,
  downloadBlob: DownloadBlob
) {
  const { renderExportImage, getSelectionExportTarget, listSelectionExportFormats } =
    createExportTargetActions(editor, state, io)

  /**
   * Renders one export. `claimName` settles its file name before it renders, so assets named
   * after the file, such as an HTML page's `<name>.assets/` folder, stay apart from another's.
   */
  async function renderExportFile(
    target: ExportRequest['target'],
    formatId: string,
    options?: ExportOptions,
    claimName: (fileName: string) => string = createExportNameClaimer()
  ): Promise<ExportedFile> {
    const format = io.getFormat(formatId)
    if (!format) throw new Error(`Unknown export format: ${formatId}`)

    const exportOptions = getExportOptions(format, options)
    const baseName = getExportBaseName(editor.graph, target)
    const extension = format.extensions[0] ?? formatId
    const fileName = claimName(getExportFileName(baseName, format, extension, options))

    const result = await io.exportContent(
      formatId,
      { graph: editor.graph, target, fileName },
      exportOptions,
      editor.renderer ? { canvasKit: editor.renderer.ck, renderer: editor.renderer } : undefined
    )

    return {
      bytes: getExportBytes(result.data),
      fileName,
      format: format.label,
      ext: `.${result.extension}`,
      mime: result.mimeType,
      assets: result.assets?.map(({ path, content }) => ({
        path,
        bytes: getExportBytes(content)
      }))
    }
  }

  /** The name a zip of `file` and its assets is saved as: the file's, ending in `.zip`. */
  function zipName(file: ExportedFile): string {
    return file.fileName.endsWith(file.ext)
      ? `${file.fileName.slice(0, -file.ext.length)}.zip`
      : `${file.fileName}.zip`
  }

  /** Saves a file, or a zip of it and the assets it refers to. */
  function saveExportFile(file: ExportedFile): Promise<boolean> {
    if (file.assets && file.assets.length > 0) {
      return saveExportedFile(
        bundleExportFiles([file]),
        zipName(file),
        'ZIP',
        '.zip',
        'application/zip',
        downloadBlob
      )
    }
    return saveExportedFile(
      file.bytes,
      file.fileName,
      file.format,
      file.ext,
      file.mime,
      downloadBlob
    )
  }

  async function exportTarget(
    target: ExportRequest['target'],
    formatId: string,
    options?: ExportOptions
  ) {
    if (await saveExportFile(await renderExportFile(target, formatId, options))) {
      trackDocumentFormat('document_exported', formatId)
    }
  }

  // Export a batch of targets. A single file downloads directly; multiple files
  // are bundled into one zip so the user gets a single download.
  async function exportTargets(requests: ExportTargetRequest[]) {
    if (requests.length === 0) return

    const files: ExportedFile[] = []
    const claimName = createExportNameClaimer()
    for (const request of requests) {
      files.push(
        await renderExportFile(request.target, request.formatId, request.options, claimName)
      )
    }

    const baseNames = new Set(requests.map((r) => getExportBaseName(editor.graph, r.target)))
    const zipBaseName = baseNames.size === 1 ? [...baseNames][0] : 'export'
    const saved =
      files.length === 1
        ? await saveExportFile(files[0])
        : await saveExportedFile(
            bundleExportFiles(files),
            `${zipBaseName}.zip`,
            'ZIP',
            '.zip',
            'application/zip',
            downloadBlob
          )
    // Counted once delivered, so a failed render or a cancelled save is not an export.
    if (saved)
      for (const { formatId } of requests) trackDocumentFormat('document_exported', formatId)
  }

  async function exportSelection(scale: number, formatId: BuiltinIOFormatId) {
    await exportTarget(getSelectionExportTarget(), formatId, { scale })
  }

  return {
    renderExportImage,
    listSelectionExportFormats,
    exportTarget,
    exportTargets,
    exportSelection
  }
}
