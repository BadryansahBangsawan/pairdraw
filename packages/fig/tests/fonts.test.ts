import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'

import { FIXTURES } from '#fig-tests/helpers/paths'
import { unzipSync } from 'fflate'

import {
  figFontEntries,
  figFontsManifest,
  readFigArchiveParts,
  resolveFigFonts,
  writeFigArchive
} from '@pairdraw/fig'

async function fixture(name: string): Promise<Uint8Array> {
  return new Uint8Array(await Bun.file(join(FIXTURES, 'fonts', name)).arrayBuffer())
}

describe('document fonts in .fig archives', () => {
  test('font entries name the format and resolve through the manifest', async () => {
    const data = await fixture('InterRegular-Faces.ttf')
    const entries = figFontEntries([{ family: 'Doc Sans', style: 'Regular', data }])
    expect(entries).toHaveLength(1)
    const entry = entries.at(0)
    if (!entry) throw new Error('Missing font entry')
    expect(entry.name).toBe('fonts/0.ttf')
    const manifest = figFontsManifest(entries)
    const fonts = resolveFigFonts(manifest, new Map([[entry.name, new Uint8Array(entry.data)]]))
    expect(fonts).toEqual([{ family: 'Doc Sans', style: 'Regular', data: entry.data }])
  })

  test('skips entries whose file is missing or whose bytes are not a font', async () => {
    const data = await fixture('InterRegular-Faces.ttf')
    const fonts = resolveFigFonts(
      JSON.stringify([
        { file: 'fonts/0.ttf', family: 'Doc Sans', style: 'Regular' },
        { file: 'fonts/1.ttf', family: 'Missing', style: 'Regular' },
        { file: 'fonts/evil.ttf', family: 'Evil', style: 'Regular' }
      ]),
      new Map([['fonts/0.ttf', new Uint8Array(data)]])
    )
    expect(fonts.map((font) => font.family)).toEqual(['Doc Sans'])
    expect(resolveFigFonts('not json', new Map())).toEqual([])
  })
  test('an archive without fonts reads with empty font resources', () => {
    const bytes = writeFigArchive({
      schemaDeflated: new Uint8Array([1, 2, 3]),
      kiwiData: new Uint8Array([4, 5, 6]),
      thumbnailPNG: new Uint8Array([7]),
      metaJSON: '{}'
    })
    const parts = readFigArchiveParts(bytes.buffer as ArrayBuffer)
    expect(parts.fonts).toEqual([])
    expect(parts.fontsJSON).toBeNull()
    const parsed = unzipSync(bytes, { filter: ({ name }) => name.startsWith('fonts') })
    expect(Object.keys(parsed)).toEqual([])
  })
})
