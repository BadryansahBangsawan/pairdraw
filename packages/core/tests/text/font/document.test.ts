import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'

import { SceneGraph } from '@pairdraw/scene-graph'

import { FIXTURES } from '#core-tests/helpers/paths'
import {
  documentFontsOf,
  prepareDocumentFonts,
  registerDocumentFonts
} from '#core/text/font/document'
import { exportWebFontFaceAssets } from '#core/text/web-font/assets'

async function fixture(name: string): Promise<ArrayBuffer> {
  return Bun.file(join(FIXTURES, 'fonts', name)).arrayBuffer()
}

describe('document fonts', () => {
  test('registers a font file under the names the file gives itself', async () => {
    const graph = new SceneGraph()
    const data = await fixture('InterRegular-Faces.ttf')
    const { registered, skipped } = await registerDocumentFonts(graph, [{ data }])
    expect(skipped).toBe(0)
    expect(registered[0]?.family).toBe('Inter Variable')
    expect(documentFontsOf(graph)).toHaveLength(1)
  })

  test('prefers caller-supplied names and skips invalid entries without dropping the rest', async () => {
    const graph = new SceneGraph()
    const data = await fixture('InterRegular-Faces.ttf')
    const { registered, skipped } = await registerDocumentFonts(graph, [
      { data, family: 'Doc Dropped Sans', style: 'Bold' },
      { data: new ArrayBuffer(0) },
      { data }
    ])
    expect(skipped).toBe(1)
    expect(registered.map((entry) => entry.family)).toEqual([
      'Doc Dropped Sans',
      'Inter Variable'
    ])
    expect(documentFontsOf(graph)).toHaveLength(2)
  })

  test('re-registers document fonts without reloading loaded faces', async () => {
    const graph = new SceneGraph()
    const data = await fixture('InterVariable-Latin.ttf')
    await registerDocumentFonts(graph, [{ data, family: 'Doc Repeat Sans' }])
    expect(await prepareDocumentFonts(graph)).toBe(1)
    expect(documentFontsOf(graph)).toHaveLength(1)
  })

  test('ships a document font instead of downloading it', async () => {
    const graph = new SceneGraph()
    const data = await fixture('InterVariable-Latin.ttf')
    await registerDocumentFonts(graph, [{ data, family: 'Export Sans' }])
    const { assets } = await exportWebFontFaceAssets({
      fonts: [{ family: 'Export Sans', weight: 400 }],
      providers: [],
      assetBasePath: 'assets/fonts'
    })
    expect(assets).toHaveLength(1)
    expect(assets[0]).toMatchObject({ family: 'Export Sans', weight: 400, format: 'truetype' })
    expect(assets[0]?.path).toBe('assets/fonts/export-sans-400-normal.ttf')
    expect(assets[0]?.content.byteLength).toBe(data.byteLength)
  })

  test('falls back to providers for faces the document does not carry', async () => {
    const { assets } = await exportWebFontFaceAssets({
      fonts: [{ family: 'No Such Family Anywhere', weight: 400 }],
      providers: [],
      assetBasePath: 'assets/fonts'
    })
    expect(assets).toEqual([])
  })
})
