import { zipSync, type Zippable } from 'fflate'
import { extname } from 'pathe'

import type { Editor, EditorState } from '@pairdraw/core'
import {
  findPageId,
  type ExportRequest,
  type IOFormatAdapter,
  type IORegistry
} from '@pairdraw/core/io'
import { type RasterExportFormat, renderNodesToImage } from '@pairdraw/core/io/formats/raster'
import type { SceneGraph } from '@pairdraw/scene-graph'

import { htmlExportOptions } from '@/app/document/export/html'
import type { ExportOptions } from '@/app/document/export/types'
import { pickBrowserSaveFile, supportsFileSystemAccess } from '@/app/document/io/capability'
import { isTauri } from '@/app/tauri/env'

type ExportData = string | ArrayBuffer | Uint8Array

type DownloadBlob = (data: Uint8Array, filename: string, mime: string) => void

/** A file an export writes beside its main file, such as an HTML page's images. */
export interface ExportedAsset {
  /** Relative to the main file, as the main file refers to it. */
  path: string
  bytes: Uint8Array
}

export interface ExportedFile {
  bytes: Uint8Array
  fileName: string
  format: string
  ext: string
  mime: string
  /** Files the main file refers to, saved beside it in a zip. */
  assets?: ExportedAsset[]
}

// Layer/page names flow into zip entry keys; flatten them to a single safe
// segment so separators, parent refs (`..`), or control chars can't escape the
// archive or corrupt it.
function sanitizeZipEntryName(name: string): string {
  const withoutControl = Array.from(name)
    .filter((ch) => {
      const code = ch.charCodeAt(0)
      return code >= 0x20 && code !== 0x7f
    })
    .join('')
  const flat = withoutControl
    .replace(/[/\\]+/g, '_') // path separators
    .replace(/\.{2,}/g, '_') // parent-dir refs / repeated dots
    .replace(/^[.\s]+/, '') // leading dots / whitespace
    .trim()
  return flat.length > 0 ? flat : 'export'
}

/**
 * Gives out file names for one export, each a safe zip entry name, numbering repeats
 * (`Frame@1x.png`, `Frame@1x (2).png`), so files and the assets named after them stay apart.
 */
export function createExportNameClaimer(): (fileName: string) => string {
  const used = new Set<string>()
  return (fileName) => {
    let name = sanitizeZipEntryName(fileName)
    if (used.has(name)) {
      const tail = extname(name)
      const stem = name.slice(0, name.length - tail.length)
      let i = 2
      while (used.has(`${stem} (${i})${tail}`)) i++
      name = `${stem} (${i})${tail}`
    }
    used.add(name)
    return name
  }
}

/** An asset's relative path with each folder and name made a safe zip entry name. */
function sanitizeZipEntryPath(path: string): string {
  return path
    .split(/[/\\]+/)
    .filter((segment) => segment.length > 0)
    .map(sanitizeZipEntryName)
    .join('/')
}

// Bundle several exported files into a single zip, disambiguating any
// duplicate file names (e.g. two layers both producing "Frame@1x.png"),
// with the assets each file refers to at the paths it refers to them by.
export function bundleExportFiles(files: ExportedFile[]): Uint8Array {
  const entries: Zippable = {}
  const claim = createExportNameClaimer()
  for (const file of files) {
    entries[claim(file.fileName)] = file.bytes
    for (const asset of file.assets ?? []) entries[sanitizeZipEntryPath(asset.path)] = asset.bytes
  }
  return zipSync(entries)
}

export function getExportBaseName(graph: SceneGraph, target: ExportRequest['target']): string {
  if (target.scope === 'node') return graph.getNode(target.nodeId)?.name ?? 'Export'
  if (target.scope === 'selection' && target.nodeIds.length === 1) {
    return graph.getNode(target.nodeIds[0])?.name ?? 'Export'
  }
  if (target.scope === 'page') return graph.getNode(target.pageId)?.name ?? 'Page'
  return 'Export'
}

export function getExportOptions(format: IOFormatAdapter, options?: ExportOptions): unknown {
  if (format.exportOptions?.scale) {
    const quality = format.exportOptions.quality ? options?.quality : undefined
    return { scale: options?.scale ?? 1, ...(quality === undefined ? {} : { quality }) }
  }
  if (format.id === 'html' && options?.html) return htmlExportOptions(options.html)
  if (format.id === 'pdf' && options?.pdfPages) return { pages: options.pdfPages }
  return undefined
}

export function getExportFileName(
  baseName: string,
  format: IOFormatAdapter,
  extension: string,
  options?: ExportOptions
): string {
  return format.exportOptions?.scale
    ? `${baseName}@${options?.scale ?? 1}x.${extension}`
    : `${baseName}.${extension}`
}

export function getExportBytes(data: ExportData): Uint8Array {
  return typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
}

export function createExportTargetActions(editor: Editor, state: EditorState, io: IORegistry) {
  /**
   * Renders `nodeIds` on the page that holds them, which need not be the page on screen;
   * without IDs, renders every layer of `pageId`.
   */
  async function renderExportImage(
    nodeIds: string[],
    scale: number,
    format: RasterExportFormat,
    pageId = state.currentPageId,
    quality?: number
  ): Promise<Uint8Array<ArrayBuffer> | null> {
    const renderer = editor.renderer
    if (!renderer) return null
    const ids = nodeIds.length > 0 ? nodeIds : editor.graph.getChildren(pageId).map((n) => n.id)
    if (ids.length === 0) return null
    const ownerPageId = findPageId(editor.graph, ids[0]) ?? pageId
    return renderNodesToImage(renderer.ck, renderer, editor.graph, ownerPageId, ids, {
      scale,
      format,
      quality
    })
  }

  function getSelectionExportTarget(): ExportRequest['target'] {
    const ids = [...state.selectedIds]
    if (ids.length > 0) return { scope: 'selection', nodeIds: ids }
    return { scope: 'page', pageId: state.currentPageId }
  }

  function listSelectionExportFormats(): IOFormatAdapter[] {
    return io.listExportFormats(state.selectedIds.size > 0 ? 'selection' : 'page')
  }

  return { renderExportImage, getSelectionExportTarget, listSelectionExportFormats }
}

export async function chooseTauriExportPath(fileName: string, format: string, ext: string) {
  const { save } = await import('@tauri-apps/plugin-dialog')
  return save({
    defaultPath: fileName,
    filters: [{ name: format, extensions: [ext.slice(1)] }]
  })
}

export async function writeTauriExportFile(path: string, data: Uint8Array) {
  const { writeFile: tauriWrite } = await import('@tauri-apps/plugin-fs')
  await tauriWrite(path, data)
}

/** Saves an exported file and reports whether it was saved; `false` means the person cancelled. */
export async function saveExportedFile(
  data: Uint8Array,
  fileName: string,
  format: string,
  ext: string,
  mime: string,
  downloadBlob: DownloadBlob
): Promise<boolean> {
  if (isTauri()) {
    const path = await chooseTauriExportPath(fileName, format, ext)
    if (!path) return false
    await writeTauriExportFile(path, data)
    return true
  }

  if (supportsFileSystemAccess()) {
    try {
      const handle = await pickBrowserSaveFile({
        suggestedName: fileName,
        types: [
          {
            description: `${format} file`,
            accept: { [mime]: [ext] }
          }
        ]
      })
      if (!handle) return false
      const writable = await handle.createWritable()
      await writable.write(new Uint8Array(data))
      await writable.close()
      return true
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false
    }
  }

  downloadBlob(data, fileName, mime)
  return true
}
