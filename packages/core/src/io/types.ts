import type { CanvasKit } from 'canvaskit-wasm'

import type { TailwindStylesheetLoader } from '@pairdraw/dom-css/export'
import type { PenWriteWarning } from '@pairdraw/pen'
import type { SceneGraph } from '@pairdraw/scene-graph'
import type { RenderColorSpace } from '@pairdraw/scene-graph/color'

import type { SkiaRenderer } from '#core/canvas'
import type { IconProvider } from '#core/icons'

import type { DrawioWriteWarning } from './formats/drawio/warnings'
import type { RasterExportFormat } from './formats/raster'

export type IOFormatRole = 'native-document' | 'interchange-document' | 'derived-export'

export type IOFormatCategory = 'document' | 'raster' | 'vector' | 'code' | 'print'

export type IOTextEncoding = 'utf8'

export type IOBinaryData = Uint8Array
export type IOTextData = string
export type IOData = IOBinaryData | IOTextData

export interface ReadDocumentInput {
  /**
   * The file's name, which its format is told by. A host that passes `openImport` names the
   * document by the path its imports resolve paths to, as `openImport` names what it opens, so an
   * import leading back to the document is recognized.
   */
  name?: string
  mimeType?: string
  data: Uint8Array
  /**
   * Reads a file a document names relative to itself, such as a `.pen` document's images; null
   * when it cannot. Hosts that know where the document lives pass it.
   */
  readAsset?(path: string): Promise<Uint8Array | null>
  /**
   * Opens a document this one imports, such as a `.pen` library, by the path it names it with,
   * relative to this document; null when it cannot. What it gives reads the imported document's
   * own files and imports relative to that document, and names it by a path that tells one file
   * from another, so a document importing itself through others is read once. Hosts that can read
   * files beside the document pass it; without it, imports stay unresolved.
   */
  openImport?(path: string): Promise<ReadDocumentInput | null>
}

/** Something a document names that reading it could not bring in; it opens without it. */
export type ReadDocumentWarning =
  | {
      kind: 'unresolved-imports'
      /**
       * Why: the host gives no access to files beside the document, as a browser does, or the
       * files could not be read or are not documents of the format.
       */
      reason: 'no-file-access' | 'unreadable'
      /** The paths the document names them with. */
      paths: string[]
    }
  | {
      /** Variables a document references that it does not define, which read as their fallbacks. */
      kind: 'unknown-variable'
      /** The variable names as the document writes them, without the `$`. */
      names: string[]
    }
  | {
      /** Image files a paint names that the host opened the document without. */
      kind: 'missing-image'
      /** The URLs as the document writes them. */
      urls: string[]
    }
  | {
      /** Node types this reader does not know, which read as placeholder frames. */
      kind: 'unknown-node'
      /** The type names as the document writes them. */
      types: string[]
    }

export interface ReadDocumentResult {
  graph: SceneGraph
  sourceFormat: string
  /** What the document names that it opened without, for the host to tell the user. */
  warnings?: ReadDocumentWarning[]
}

export interface ExportTargetDocument {
  scope: 'document'
}

export interface ExportTargetPage {
  scope: 'page'
  pageId: string
}

export interface ExportTargetSelection {
  scope: 'selection'
  nodeIds: string[]
}

export interface ExportTargetNode {
  scope: 'node'
  nodeId: string
}

export type ExportTarget =
  | ExportTargetDocument
  | ExportTargetPage
  | ExportTargetSelection
  | ExportTargetNode

export interface ExportRequest {
  graph: SceneGraph
  target: ExportTarget
  fileName?: string
}

export interface IOContext {
  canvasKit?: CanvasKit
  renderer?: SkiaRenderer
  /** Where documents' icons come from; Iconify unless a host passes its own. */
  icons?: IconProvider
}

export interface FigWriteOptions {
  thumbnailPageId?: string
  renderThumbnail?: boolean
  /** The name the file's `meta.json` records; the export's `fileName` without `.fig` otherwise. */
  documentName?: string
}

export interface RasterExportOptions {
  scale?: number
  quality?: number
  colorSpace?: RenderColorSpace
  format: RasterExportFormat
}

export interface SVGExportOptions {
  xmlDeclaration?: boolean
  colorSpace?: RenderColorSpace
}

/** A file written next to an export's main file, at a path relative to it. */
export interface ExportAsset {
  path: string
  content: IOData
}

export interface ExportResult {
  format: string
  mimeType: string
  extension: string
  data: IOData
  encoding?: IOTextEncoding
  /** Extra files the main file refers to, such as external images and fonts. */
  assets?: ExportAsset[]
  /** What the format could not hold, such as the variables draw.io has no model for. */
  warnings?: string[]
  /** The same facts as kinds, for a host that shows them in its own language. */
  warningDetails?: WriteDocumentWarning[]
}

/**
 * What a writer could not put in its file, as facts: the pen and draw.io writers name their own
 * kinds, and a host translates them instead of printing the English `warnings` sentences.
 */
export type WriteDocumentWarning = PenWriteWarning | DrawioWriteWarning

export interface HTMLExportOptions {
  html?: 'fragment' | 'standalone'
  style?: 'inline' | 'tailwind'
  assets?: 'inline' | 'external'
  /** `assets` ships web fonts with external assets. */
  fonts?: 'assets' | 'none'
  /** Write each layer's name as a `data-name` attribute. Default true. */
  layerNames?: boolean
  /** Write each layer's ID as a `data-pairdraw-node-id` attribute. Default false. */
  layerIds?: boolean
  /** Reads Tailwind's stylesheets for a standalone Tailwind page where Node cannot, in browsers. */
  loadTailwindStylesheet?: TailwindStylesheetLoader
}

/** How an export with several layers makes its PDF. */
export interface PDFFormatExportOptions {
  /**
   * `frames`: a page per layer, in the order given, each sized to its layer, the default for a
   * selection. `single`: every layer on one page, the default for a page or document.
   */
  pages?: 'single' | 'frames'
}

export interface IOFormatSupport {
  readDocument?: boolean
  writeDocument?: boolean
  exportDocument?: boolean
  exportPage?: boolean
  exportSelection?: boolean
  exportNode?: boolean
}

export interface IOFormatExportOptions {
  scale?: boolean
  quality?: boolean
  colorSpace?: boolean
}

export interface IOFormatAdapter<Id extends string = string> {
  id: Id
  label: string
  role: IOFormatRole
  category: IOFormatCategory
  extensions: string[]
  mimeTypes: string[]
  support: IOFormatSupport
  exportOptions?: IOFormatExportOptions
  /**
   * The format stores layout intent rather than the sizes it implies, so reading lays the layers
   * out, measuring text with whatever measurer is installed.
   */
  laysOutOnRead?: boolean

  matchesFile?(fileName: string, mimeType?: string): boolean

  readDocument?(input: ReadDocumentInput, context?: IOContext): Promise<ReadDocumentResult>
  writeDocument?(graph: SceneGraph, options?: unknown, context?: IOContext): Promise<ExportResult>
  exportContent?(
    request: ExportRequest,
    options?: unknown,
    context?: IOContext
  ): Promise<ExportResult>
}
