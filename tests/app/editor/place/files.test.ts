import { describe, expect, test } from 'bun:test'

import { IMPORTABLE_RASTER_TYPES, isSVGFile } from '@pairdraw/scene-graph/images'

import {
  PLACE_IMAGE_ACCEPT,
  PLACE_IMAGE_EXTENSIONS,
  placeImageFile
} from '@/app/editor/place/files'

/** The smallest PNG header `imageHeader` reads: signature, IHDR length and type, 1 × 1 pixels. */
const PNG_HEADER = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00
])

const placeable = (file: File) => IMPORTABLE_RASTER_TYPES.has(file.type) || isSVGFile(file)

describe('placeImageFile', () => {
  test('types a raster read from disk by its bytes, whatever its extension says', () => {
    const file = placeImageFile('/Users/me/Pictures/photo.jpeg', PNG_HEADER)
    expect(file.name).toBe('photo.jpeg')
    expect(file.type).toBe('image/png')
    expect(placeable(file)).toBe(true)
  })

  test('types SVG and AVIF by extension, which image headers do not name', () => {
    const svg = placeImageFile('C:\\Art\\Mark.SVG', new TextEncoder().encode('<svg/>'))
    expect(svg.name).toBe('Mark.SVG')
    expect(placeable(svg)).toBe(true)
    expect(placeable(placeImageFile('/tmp/scan.avif', new Uint8Array([0, 1, 2])))).toBe(true)
  })

  test('leaves a file it cannot recognise untyped, so placing skips it', () => {
    expect(placeable(placeImageFile('/tmp/notes.txt', new Uint8Array([1, 2, 3])))).toBe(false)
  })
})

describe('the picker', () => {
  test('offers every extension it lists, by name as well as media type', () => {
    const accepted = PLACE_IMAGE_ACCEPT.split(',')
    for (const extension of PLACE_IMAGE_EXTENSIONS) expect(accepted).toContain(`.${extension}`)
    for (const type of IMPORTABLE_RASTER_TYPES) expect(accepted).toContain(type)
  })
})
