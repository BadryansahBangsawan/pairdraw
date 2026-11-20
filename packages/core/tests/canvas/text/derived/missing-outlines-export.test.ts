import { afterAll, beforeAll, expect, setDefaultTimeout, test } from 'bun:test'
import { join } from 'node:path'

import { expectDefined } from '#core-tests/helpers/assert'
import { FIXTURES } from '#core-tests/helpers/paths'
import type { CanvasKit, TypefaceFontProvider } from 'canvaskit-wasm'

import { exportFigFile } from '#core/io/formats/fig'
import { getCanvasKit } from '#core/canvaskit'
import { fontManager } from '#core/text/font/manager'
import { parseFigBuffer } from '@pairdraw/fig'
import { SceneGraph } from '@pairdraw/scene-graph'

setDefaultTimeout(60_000)

const FALLBACK = 'Export Test Unparsed Arabic'

/**
 * A face the layout draws Arabic in but the outline parser never saw: the shaper cannot tell
 * which font drew those glyphs, so none of the node's glyphs gets an outline. Figma draws saved
 * text only from its glyph outlines, so the node must be saved without derived text for Figma to
 * lay it out itself instead of drawing holes.
 */
let ck: CanvasKit
let provider: TypefaceFontProvider

beforeAll(async () => {
  ck = await getCanvasKit()
  const latin = await Bun.file(join(FIXTURES, 'fonts', 'InterVariable-Latin.ttf')).arrayBuffer()
  await fontManager.markLoaded('Inter', 'Regular', latin)
  const naskh = await Bun.file(join(FIXTURES, 'fonts', 'NotoNaskhArabic-Regular.ttf')).arrayBuffer()
  fontManager.setLetterFallbackFamily('arabic', FALLBACK)
  provider = ck.TypefaceFontProvider.Make()
  fontManager.attachProvider(ck, provider)
  // Registered for layout only; fontManager.markLoaded would also parse it for outlines.
  provider.registerFont(naskh, FALLBACK)
})

afterAll(() => {
  // The export's shaping shared this provider and released it, deleting it with its last share.
  if (!provider.isDeleted()) {
    fontManager.detachProvider(provider)
    provider.delete()
  }
})

test('saves text whose glyphs have no outlines without derived text', async () => {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  graph.createNode('TEXT', page.id, {
    name: 'Arabic',
    text: 'مرحبا',
    fontFamily: 'Inter',
    fontSize: 24,
    width: 240,
    height: 40
  })

  const saved = await exportFigFile(graph)
  const text = expectDefined(
    parseFigBuffer(saved.slice().buffer).nodeChanges.find((nc) => nc.type === 'TEXT'),
    'text record'
  )

  expect(text.derivedTextData).toBeUndefined()
  expect(text.textData?.characters).toBe('مرحبا')
})