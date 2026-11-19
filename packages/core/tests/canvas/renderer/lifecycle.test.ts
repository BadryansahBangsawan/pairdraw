import { expect, mock, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import { SkiaRenderer } from '#core/canvas'
import type { Surface } from 'canvaskit-wasm'
import { initCanvasKit } from '#core/io/formats/raster/headless'
import { fontManager } from '#core/text/font/manager'

const ck = await initCanvasKit()

const renderer = () => new SkiaRenderer(ck, expectDefined(ck.MakeSurface(1, 1), 'surface'))

test('destroying a renderer that never loaded fonts leaves the others their fonts', async () => {
  const drawing = renderer()
  await drawing.loadFonts()
  const provider = expectDefined(drawing.getFontProvider(), 'font provider')
  try {
    renderer().destroy()
    expect(fontManager.providerFor(ck)).toBe(provider)
  } finally {
    drawing.destroy()
  }
})

/** Counts the calls to a surface's own `dispose`, and to its `delete`, on this one surface. */
function watching(surface: Surface) {
  const disposed = mock(() => undefined)
  const deleted = mock(() => undefined)
  surface.dispose = disposed
  surface.delete = deleted
  return { disposed, deleted }
}

test('replacing a surface disposes the one it replaces, freeing its pixel buffer', () => {
  const first = expectDefined(ck.MakeSurface(4, 4), 'first surface')
  const drawing = new SkiaRenderer(ck, first)
  const { disposed, deleted } = watching(first)
  try {
    drawing.replaceSurface(expectDefined(ck.MakeSurface(4, 4), 'next surface'))
    expect(disposed).toHaveBeenCalledTimes(1)
    expect(deleted).not.toHaveBeenCalled()
  } finally {
    drawing.destroy()
  }
})

test('destroying a renderer disposes its surface and frees the font it lent the profiler', async () => {
  const drawing = renderer()
  await drawing.loadFonts()
  const hud = expectDefined(drawing.hudFont, 'hud font')
  const { disposed, deleted } = watching(drawing.surface)
  const fontDeleted = mock(() => undefined)
  hud.delete = fontDeleted

  drawing.destroy()

  expect(disposed).toHaveBeenCalledTimes(1)
  expect(deleted).not.toHaveBeenCalled()
  expect(fontDeleted).toHaveBeenCalledTimes(1)
})
