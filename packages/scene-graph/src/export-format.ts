/**
 * Formats a node's export settings may persist. Each id must name a Core IO
 * export adapter that supports node export; labels and options come from that
 * adapter, so this list only decides what the Export panel offers.
 */
export const EXPORT_FORMAT_IDS = [
  'png',
  'jpg',
  'webp',
  'svg',
  'pdf',
  'html',
  'pptx',
  'drawio'
] as const

export type ExportFormatId = (typeof EXPORT_FORMAT_IDS)[number]

export function isExportFormatId(value: unknown): value is ExportFormatId {
  return EXPORT_FORMAT_IDS.some((id) => id === value)
}

/** JPG and WEBP compression quality, from most compressed to best looking. */
export const MIN_EXPORT_QUALITY = 1
export const MAX_EXPORT_QUALITY = 100
/** What the encoders use when an export names no quality. */
export const DEFAULT_EXPORT_QUALITY = 90

/** A whole quality within bounds, whatever an edit or a file supplied. */
export function clampExportQuality(quality: number): number {
  if (!Number.isFinite(quality)) return DEFAULT_EXPORT_QUALITY
  return Math.min(MAX_EXPORT_QUALITY, Math.max(MIN_EXPORT_QUALITY, Math.round(quality)))
}
