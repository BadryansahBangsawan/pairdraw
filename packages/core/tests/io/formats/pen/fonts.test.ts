import { describe, expect, spyOn, test } from 'bun:test'

import { fontManager } from '@pairdraw/core/text'
import { IORegistry, penFormat } from '@pairdraw/core/io'

import { expectDefined, getNodeOrThrow } from '#core-tests/helpers/assert'

const io = new IORegistry([penFormat])

const fontFile = async (path: string) => new Uint8Array(await Bun.file(path).arrayBuffer())

/** A document `My Design.pen` bundling `fonts`, with one text layer in each `families`. */
async function read(fonts: { name: string; url: string }[], families: string[]) {
  const files = new Map([
    ['My Design-assets/Inter-SemiBold.ttf', await fontFile('packages/core/assets/Inter-SemiBold.ttf')],
    [
      'My Design-assets/NotoNaskhArabic-Regular.ttf',
      await fontFile('packages/core/assets/NotoNaskhArabic-Regular.ttf')
    ],
    [
      'My Design-assets/InterVariable-Italic.ttf',
      await fontFile('packages/core/assets/InterVariable-Italic.ttf')
    ],
    [
      'My Design-assets/InterVariable-Faces.woff2',
      await fontFile('tests/fixtures/fonts/InterVariable-Faces.woff2')
    ]
  ])
  const asked: string[] = []
  const { graph } = await io.readDocument({
    name: 'My Design.pen',
    data: new TextEncoder().encode(
      JSON.stringify({
        version: '2.21',
        fonts,
        children: families.map((fontFamily, index) => ({
          id: `t${index}`,
          type: 'text',
          content: 'Hello',
          fontFamily,
          fontWeight: 'normal'
        }))
      })
    ),
    readAsset: async (path) => {
      asked.push(path)
      return files.get(path) ?? null
    }
  })
  return { graph, asked }
}

describe('penFormat.readDocument — bundled fonts', () => {
  test('sets text in the family and style its bundled file names itself with', async () => {
    const { graph } = await read(
      [{ name: 'Inter-SemiBold', url: 'My Design-assets/Inter-SemiBold.ttf' }],
      ['Inter-SemiBold']
    )
    expect(getNodeOrThrow(graph, 't0')).toMatchObject({
      fontFamily: 'Inter',
      fontStyle: 'SemiBold',
      fontWeight: 600,
      italic: false
    })
  })

  test('drops the stale family binding when a bundled face replaces it', async () => {
    const { graph } = await io.readDocument({
      name: 'My Design.pen',
      data: new TextEncoder().encode(
        JSON.stringify({
          version: '2.21',
          variables: { font: { type: 'string', value: 'Inter-SemiBold' } },
          fonts: [{ name: 'Inter-SemiBold', url: 'My Design-assets/Inter-SemiBold.ttf' }],
          children: [
            {
              id: 't0',
              type: 'text',
              content: 'Hello',
              fontFamily: '$font',
              fontWeight: 'normal'
            }
          ]
        })
      ),
      readAsset: async (path) =>
        path === 'My Design-assets/Inter-SemiBold.ttf'
          ? fontFile('packages/core/assets/Inter-SemiBold.ttf')
          : null
    })
    const node = getNodeOrThrow(graph, 't0')
    expect(node).toMatchObject({ fontFamily: 'Inter', fontStyle: 'SemiBold', fontWeight: 600 })
    // The pen-only name is no family any font is registered under, so it must not come back.
    expect(node.boundVariables.fontFamily).toBeUndefined()
  })

  test('registers the bundled file under those names', async () => {
    // Other tests register this font too, so the call itself is what shows this read made it.
    const markLoaded = spyOn(fontManager, 'markLoaded')
    try {
      await read(
        [{ name: 'Naskh', url: 'My Design-assets/NotoNaskhArabic-Regular.ttf' }],
        ['Naskh']
      )
      const file = await fontFile('packages/core/assets/NotoNaskhArabic-Regular.ttf')
      expect(markLoaded).toHaveBeenCalledWith('Noto Naskh Arabic', 'Regular', file.buffer)
    } finally {
      markLoaded.mockRestore()
    }
  })

  test('reads a bundled WOFF2 file, registering it decompressed', async () => {
    const markLoaded = spyOn(fontManager, 'markLoaded')
    try {
      const { graph } = await read(
        [{ name: 'Inter-Web', url: 'My Design-assets/InterVariable-Faces.woff2' }],
        ['Inter-Web']
      )
      expect(getNodeOrThrow(graph, 't0')).toMatchObject({
        fontFamily: 'Inter Variable',
        fontStyle: 'Regular'
      })
      const call = markLoaded.mock.calls.find(([family]) => family === 'Inter Variable')
      // An sfnt with TrueType outlines, not the `wOF2` file it came as.
      expect(new DataView(expectDefined(call, 'registration')[2]).getUint32(0)).toBe(0x00010000)
    } finally {
      markLoaded.mockRestore()
    }
  })

  test('registers an italic under the style key text draws it with', async () => {
    const markLoaded = spyOn(fontManager, 'markLoaded')
    try {
      const { graph } = await read(
        [{ name: 'Inter-Italic', url: 'My Design-assets/InterVariable-Italic.ttf' }],
        ['Inter-Italic']
      )
      expect(getNodeOrThrow(graph, 't0')).toMatchObject({
        fontFamily: 'Inter Variable',
        fontStyle: 'Italic',
        italic: true
      })
      expect(markLoaded.mock.calls.map(([family, style]) => [family, style])).toContainEqual([
        'Inter Variable',
        'Regular Italic'
      ])
    } finally {
      markLoaded.mockRestore()
    }
  })

  test('keeps the name of a bundled font whose file cannot be read', async () => {
    const { graph } = await read(
      [{ name: 'Geist-SemiBold', url: 'My Design-assets/Geist-SemiBold.ttf' }],
      ['Geist-SemiBold']
    )
    expect(getNodeOrThrow(graph, 't0')).toMatchObject({
      fontFamily: 'Geist-SemiBold',
      fontWeight: 400
    })
  })
})
