import { expect, test } from 'bun:test'
import { expectDefined } from '#core-tests/helpers/assert'
import type { CanvasKit, TypefaceFontProvider } from 'canvaskit-wasm'

import { createDefaultNode } from '@pairdraw/scene-graph/node-defaults'

import { documentImageInfo } from '#core/canvas/renderer/colors'
import { buildParagraph, buildTextPicture } from '#core/canvas/text'
import { getCanvasKit } from '#core/canvaskit'
import { FontManager, fontManager } from '#core/text/font/manager'

test('draws a text fill stored in Display P3 without clipping it to sRGB', async () => {
  const ck: CanvasKit = await getCanvasKit()
  const fontProvider: TypefaceFontProvider = ck.TypefaceFontProvider.Make()
  fontManager.attachProvider(ck, fontProvider)
  const family = 'Wide Gamut Test Sans'
  const data = await new FontManager().fetchBundledFont('/InterVariable.ttf')
  await fontManager.markLoaded(family, 'Regular', expectDefined(data, 'font'))
  const text = 'Ag'
  const node = createDefaultNode(() => 'wide-gamut-text', 'TEXT', {
    text,
    fontFamily: family,
    fontWeight: 400,
    fontSize: 60,
    width: 200,
    height: 90,
    styleRuns: [
      {
        start: 0,
        length: text.length,
        style: { fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 1, visible: true }] }
      }
    ]
  })
  const paragraph = buildParagraph(
    { ck, fontProvider, fontsLoaded: true, documentColorSpace: 'display-p3' },
    node,
    ck.BLACK,
    { halfLeading: true }
  )
  const screen = expectDefined(ck.MakeSurface(200, 90), 'surface')
  const surface = screen.makeSurface(documentImageInfo(ck, 'display-p3', 200, 90))
  try {
    surface.getCanvas().clear(ck.BLACK)
    paragraph.layout(200)
    paragraph.draw(surface.getCanvas(), 0, 0)
    const pixels = expectDefined(
      surface.getCanvas().readPixels(0, 0, {
        width: 200,
        height: 90,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.DISPLAY_P3
      }),
      'pixels'
    ) as Uint8Array
    let greenest = 0
    let redAtGreenest = 255
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 1] > greenest) {
        greenest = pixels[index + 1]
        redAtGreenest = pixels[index]
      }
    }
    // Display P3 green is far outside sRGB: clipping it first would add red here.
    expect(greenest).toBeGreaterThan(240)
    expect(redAtGreenest).toBeLessThan(8)
  } finally {
    surface.dispose()
    screen.dispose()
    paragraph.delete()
  }
})

test('a text picture keeps a keycap frame in the document profile', async () => {
  const ck: CanvasKit = await getCanvasKit()
  const fontProvider: TypefaceFontProvider = ck.TypefaceFontProvider.Make()
  fontManager.attachProvider(ck, fontProvider)
  const family = 'Wide Gamut Picture Sans'
  const data = await new FontManager().fetchBundledFont('/InterVariable.ttf')
  await fontManager.markLoaded(family, 'Regular', expectDefined(data, 'font'))
  const text = '1\ufe0f\u20e3'
  const node = createDefaultNode(() => 'wide-gamut-picture', 'TEXT', {
    text,
    fontFamily: family,
    fontWeight: 400,
    fontSize: 60,
    width: 200,
    height: 90,
    styleRuns: [
      {
        start: 2,
        length: 1,
        style: {
          fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0, a: 1 }, opacity: 1, visible: true }]
        }
      }
    ]
  })
  const bytes = expectDefined(
    buildTextPicture(
      { ck, fontProvider, fontsLoaded: true, documentColorSpace: 'display-p3' },
      node
    ),
    'picture'
  )
  const picture = expectDefined(ck.MakePicture(bytes), 'decoded picture')
  const screen = expectDefined(ck.MakeSurface(200, 90), 'surface')
  const surface = screen.makeSurface(documentImageInfo(ck, 'display-p3', 200, 90))
  try {
    surface.getCanvas().clear(ck.BLACK)
    surface.getCanvas().drawPicture(picture)
    const pixels = expectDefined(
      surface.getCanvas().readPixels(0, 0, {
        width: 200,
        height: 90,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.DISPLAY_P3
      }),
      'pixels'
    ) as Uint8Array
    let greenest = 0
    let redAtGreenest = 255
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 1] > greenest) {
        greenest = pixels[index + 1]
        redAtGreenest = pixels[index]
      }
    }
    expect(greenest).toBeGreaterThan(240)
    expect(redAtGreenest).toBeLessThan(8)
  } finally {
    surface.dispose()
    screen.dispose()
    picture.delete()
  }
})
