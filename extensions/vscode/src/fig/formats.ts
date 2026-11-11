import type { EmbedDocumentFormat } from '../embed/protocol'

/** The custom editor view types this extension registers, one per document format. */
export const FIG_VIEW_TYPE = 'pairdraw.fig'
export const PEN_VIEW_TYPE = 'pairdraw.pen'

const FORMATS: readonly {
  format: EmbedDocumentFormat
  extension: string
  viewType: string
}[] = [
  { format: 'fig', extension: '.fig', viewType: FIG_VIEW_TYPE },
  { format: 'pen', extension: '.pen', viewType: PEN_VIEW_TYPE }
]

function formatOf(path: string) {
  const lower = path.toLowerCase()
  return FORMATS.find(({ extension }) => lower.endsWith(extension)) ?? null
}

/**
 * The format a save writes, from the destination's name: saving `.fig` bytes over a `.pen` file
 * would replace its text with an archive, so the destination decides, not the open document.
 */
export function documentFormat(path: string): EmbedDocumentFormat {
  return formatOf(path)?.format ?? 'fig'
}

/**
 * The Design Mode editor a file opens in. `.pen` files open in Design Mode only when asked,
 * because VS Code's text editor is their default; null means neither format.
 */
export function designViewType(path: string): string | null {
  return formatOf(path)?.viewType ?? null
}

/**
 * The view a toggle switches to: Design Mode from a text editor, and VS Code's own editor
 * (`default`) from Design Mode.
 */
export function toggledViewType(viewType: string, path: string): string | null {
  if (viewType === 'default') return designViewType(path)
  if (FORMATS.some(({ viewType: design }) => design === viewType)) return 'default'
  return null
}