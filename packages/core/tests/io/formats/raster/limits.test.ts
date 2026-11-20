import { expect, test } from 'bun:test'

import {
  assertExportSize,
  exportRenderScale,
  MAX_EXPORT_PIXELS
} from '@pairdraw/core/io/formats/raster'

test('refuses an export larger than the renderer may allocate, with a clear message', () => {
  expect(() => assertExportSize(4000, 4000)).not.toThrow()
  expect(() => assertExportSize(16000, 16000)).toThrow(/Export is too large/)
  expect(() => assertExportSize(MAX_EXPORT_PIXELS, 2)).toThrow(/Reduce the scale/)
})

test('supersamples small exports and renders large ones at their own scale', () => {
  expect(exportRenderScale(4000, 4000)).toBe(2)
  expect(exportRenderScale(8000, 8000)).toBe(1)
  expect(exportRenderScale(12000, 12000)).toBe(1)
})
