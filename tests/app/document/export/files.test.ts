import { describe, expect, test } from 'bun:test'

import { strFromU8, unzipSync } from 'fflate'

import { BUILTIN_IO_FORMATS, IORegistry } from '@pairdraw/core/io'

import {
  bundleExportFiles,
  createExportNameClaimer,
  getExportOptions,
  type ExportedFile
} from '@/app/document/export/files'
import { DEFAULT_HTML_EXPORT_SETTINGS } from '@/app/document/export/html'

const io = new IORegistry(BUILTIN_IO_FORMATS)

function format(id: string) {
  const found = io.getFormat(id)
  if (!found) throw new Error(`Missing format ${id}`)
  return found
}

function page(fileName: string, assets: ExportedFile['assets'] = []): ExportedFile {
  return {
    bytes: new TextEncoder().encode(`<img src="${assets[0]?.path ?? ''}">`),
    fileName,
    format: 'HTML',
    ext: '.html',
    mime: 'text/html',
    assets
  }
}

describe('export file names', () => {
  test('repeats are numbered and unsafe names flattened', () => {
    const claim = createExportNameClaimer()
    expect(claim('Frame@1x.png')).toBe('Frame@1x.png')
    expect(claim('Frame@1x.png')).toBe('Frame@1x (2).png')
    expect(claim('../a/b.png')).toBe('__a_b.png')
  })
})

describe('export zips', () => {
  test('hold each file with the assets it refers to, at the paths it uses', () => {
    const image = new Uint8Array([1, 2, 3])
    const zip = unzipSync(
      bundleExportFiles([
        page('Card.html', [{ path: 'Card.assets/images/image-1.png', bytes: image }]),
        page('Card (2).html', [{ path: 'Card (2).assets/images/image-1.png', bytes: image }])
      ])
    )
    expect(Object.keys(zip).sort()).toEqual([
      'Card (2).assets/images/image-1.png',
      'Card (2).html',
      'Card.assets/images/image-1.png',
      'Card.html'
    ])
    expect(strFromU8(zip['Card.html'] ?? new Uint8Array())).toContain(
      'Card.assets/images/image-1.png'
    )
  })

  test('keep asset paths inside the archive', () => {
    const zip = unzipSync(
      bundleExportFiles([
        page('Card.html', [{ path: '../../escape/../x.png', bytes: new Uint8Array([1]) }])
      ])
    )
    for (const name of Object.keys(zip)) expect(name.split('/')).not.toContain('..')
  })
})

describe('export options', () => {
  test('a quality reaches only the formats that compress with one', () => {
    expect(getExportOptions(format('jpg'), { scale: 2, quality: 60 })).toEqual({
      scale: 2,
      quality: 60
    })
    expect(getExportOptions(format('png'), { scale: 2, quality: 60 })).toEqual({ scale: 2 })
  })

  test('a PDF can be asked for a page per layer or one page', () => {
    expect(getExportOptions(format('pdf'), { pdfPages: 'frames' })).toEqual({ pages: 'frames' })
    expect(getExportOptions(format('pdf'))).toBeUndefined()
  })

  test('HTML takes its settings, and web fonts only for a page with separate files', () => {
    const fragment = getExportOptions(format('html'), {
      html: { ...DEFAULT_HTML_EXPORT_SETTINGS, html: 'fragment', assets: 'external' }
    })
    expect(fragment).toMatchObject({
      html: 'fragment',
      assets: 'external',
      fonts: 'none',
      layerNames: true,
      layerIds: false
    })
    const page = getExportOptions(format('html'), {
      html: { ...DEFAULT_HTML_EXPORT_SETTINGS, assets: 'external' }
    })
    expect(page).toMatchObject({ html: 'standalone', fonts: 'assets' })
    expect(getExportOptions(format('html'))).toBeUndefined()
  })
})
