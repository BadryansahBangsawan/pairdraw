import { basename, extname } from 'pathe'

import { imageHeader, IMPORTABLE_RASTER_TYPES } from '@open-pencil/scene-graph/images'

/**
 * What Place image offers to open: the raster images a layer can show, and SVG, which becomes
 * editable layers, as a dropped file does.
 */
export const PLACE_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg'] as const

/**
 * The browser file picker's `accept` list, by media type and by extension, since some systems
 * report an SVG file without a media type.
 */
export const PLACE_IMAGE_ACCEPT = [
  ...IMPORTABLE_RASTER_TYPES,
  'image/svg+xml',
  ...PLACE_IMAGE_EXTENSIONS.map((extension) => `.${extension}`)
].join(',')

/** Media types read from the name alone, for formats whose header `imageHeader` does not name. */
const TYPE_BY_EXTENSION: Partial<Record<string, string>> = {
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml'
}

/**
 * A file read from disk by path, as the desktop app's file dialog returns it, with the media type
 * placing needs: read from the bytes' header, or from the extension for AVIF and SVG.
 */
export function placeImageFile(path: string, bytes: Uint8Array<ArrayBuffer>): File {
  const name = basename(path) || 'image'
  const type = imageHeader(bytes)?.type ?? TYPE_BY_EXTENSION[extname(name).toLowerCase()] ?? ''
  return new File([bytes], name, { type })
}
