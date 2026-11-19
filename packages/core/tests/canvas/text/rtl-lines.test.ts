import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'
import type { CanvasKit, TypefaceFontProvider } from 'canvaskit-wasm'

import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'

import type { TextLayout } from '#core/canvas/text/layout'
import { buildParagraph } from '#core/canvas/text/layout/build'
import { getCanvasKit } from '#core/canvaskit'
import { fontManager } from '#core/text/font/manager'

const ARABIC = 'الطاولة محجوزة لك'
const SURFACE_WIDTH = 400

let ck: CanvasKit
let provider: TypefaceFontProvider

function layOut(props: Partial<SceneNode> = {}): TextLayout {
  const graph = new SceneGraph()
  const node = graph.createNode('TEXT', graph.getPages()[0].id, {
    fontFamily: 'Inter',
    fontSize: 20,
    width: 320,
    height: 40,
    textAutoResize: 'NONE',
    textAlignHorizontal: 'LEFT',
    text: ARABIC,
    ...props
  })
  if (!('textDirection' in props)) Reflect.deleteProperty(node, 'textDirection')
  return buildParagraph({ ck, fontProvider: provider, fontsLoaded: true }, node)
}

/** The rightmost column with ink, drawing the layout at scale 1. */
function rightmostInk(layout: TextLayout): number {
  const height = Math.ceil(layout.getHeight()) + 10
  const surface = expectDefined(ck.MakeSurface(SURFACE_WIDTH, height), 'surface')
  try {
    const canvas = surface.getCanvas()
    canvas.clear(ck.WHITE)
    layout.draw(canvas, 0, 0)
    const pixels = expectDefined(
      canvas.readPixels(0, 0, {
        width: SURFACE_WIDTH,
        height,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      }),
      'pixels'
    )
    for (let x = SURFACE_WIDTH - 1; x >= 0; x--) {
      for (let y = 0; y < height; y++) {
        if (pixels[(y * SURFACE_WIDTH + x) * 4] < 128) return x
      }
    }
    return -1
  } finally {
    surface.delete()
  }
}

describe('Arabic text with no stored direction', () => {
  beforeAll(async () => {
    ck = await getCanvasKit()
    provider = ck.TypefaceFontProvider.Make()
    fontManager.attachProvider(ck, provider)
    const inter = expectDefined(
      await fontManager.fetchBundledFont('/InterVariable.ttf'),
      'bundled Inter font'
    )
    provider.registerFont(inter, 'Inter')
    await fontManager.markLoaded('Inter', 'Regular', inter)
  })

  afterAll(() => {
    fontManager.detachProvider(provider)
    provider.delete()
  })

  test('lays out as the same text with dir="rtl"', () => {
    const auto = rightmostInk(layOut())
    const rtl = rightmostInk(layOut({ textDirection: 'RTL' }))
    // Both are start-aligned Arabic: the line ends at the same edge. An LTR base puts it left.
    expect(Math.abs(auto - rtl)).toBeLessThanOrEqual(2)
    expect(auto).toBeGreaterThan(300)
  })
})
