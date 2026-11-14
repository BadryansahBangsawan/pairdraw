import { expect, test } from 'bun:test'
import { join } from 'node:path'

import { exportFigFile } from '@pairdraw/core/io/formats/fig'
import { parseFigBuffer, resolveFigFonts } from '@pairdraw/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph } from '@pairdraw/scene-graph'

import { FIXTURES } from '#core-tests/helpers/paths'
import {
  documentFontsOf,
  prepareDocumentFonts,
  registerDocumentFonts
} from '#core/text/font/document'

async function fixture(name: string): Promise<ArrayBuffer> {
  return Bun.file(join(FIXTURES, 'fonts', name)).arrayBuffer()
}

test('document fonts round-trip through a .fig archive', async () => {
  await initCodec()
  const source = new SceneGraph()
  const data = await fixture('InterVariable-Latin.ttf')
  await registerDocumentFonts(source, [{ data }])
  const bytes = await exportFigFile(source)
  const parsed = parseFigBuffer(bytes.buffer as ArrayBuffer)
  if (!parsed.fontsJSON) throw new Error('Missing fonts.json')
  const files = new Map(parsed.fonts.map(([name, entry]) => [`fonts/${name}`, entry]))
  const fonts = resolveFigFonts(parsed.fontsJSON, files)
  expect(fonts.map((font) => font.family)).toEqual(['Inter Variable'])
  const restored = new SceneGraph()
  const { registered } = await registerDocumentFonts(
    restored,
    fonts.map(({ family, style, data: bytes }) => ({
      family,
      style,
      data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
    }))
  )
  expect(registered.map((entry) => `${entry.family} ${entry.style}`)).toEqual([
    'Inter Variable Regular'
  ])
  expect(documentFontsOf(restored)).toHaveLength(1)
  expect(await prepareDocumentFonts(restored)).toBe(1)
})
