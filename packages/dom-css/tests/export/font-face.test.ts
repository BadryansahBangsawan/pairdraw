import { describe, expect, test } from 'bun:test'

import { fontFaceStylesheet, type WebFontFaceAsset } from '#dom-css/export/bundle'
import {
  exportHTMLBundle,
  sceneNodeToDesignDocument,
  type WebFontFaceResolver
} from '#dom-css/export/index'

import { SceneGraph } from '@pairdraw/scene-graph'

function asset(fields: Partial<WebFontFaceAsset>): WebFontFaceAsset {
  return {
    family: 'Pair Sans',
    weight: 400,
    style: 'normal',
    format: 'woff2',
    path: 'Card.assets/fonts/pair-sans-400.woff2',
    content: new Uint8Array(),
    ...fields
  }
}

describe('@pairdraw/dom-css font faces', () => {
  test('a face points at its file relative to the stylesheet, with format and defaults', () => {
    expect(fontFaceStylesheet([asset({})], { from: 'Card.assets' })).toBe(
      [
        '@font-face {',
        '  font-family: "Pair Sans";',
        '  src: url("fonts/pair-sans-400.woff2") format("woff2");',
        '  font-weight: 400;',
        '  font-style: normal;',
        '  font-display: swap;',
        '}',
        ''
      ].join('\n')
    )
  })

  test('a variable face keeps its weight range, stretch and unicode ranges', () => {
    const css = fontFaceStylesheet(
      [
        asset({
          weight: [100, 900],
          style: 'italic',
          display: 'block',
          stretch: '75% 125%',
          unicodeRange: ['U+0000-00FF', 'U+0131']
        })
      ],
      { from: 'Page.assets', display: 'optional' }
    )
    expect(css).toContain('font-weight: 100 900;')
    expect(css).toContain('font-style: italic;')
    expect(css).toContain('font-display: optional;')
    expect(css).toContain('font-stretch: 75% 125%;')
    expect(css).toContain('unicode-range: U+0000-00FF,U+0131;')
  })

  test('no faces make an empty stylesheet', () => {
    expect(fontFaceStylesheet([], { from: 'Card.assets' })).toBe('')
  })

  test('a standalone page with external assets publishes an @font-face rule for its font', async () => {
    const graph = new SceneGraph()
    const title = graph.createNode('TEXT', graph.getPages()[0].id, {
      name: 'Title',
      text: 'Hello',
      fontFamily: 'Inter',
      width: 80,
      height: 24
    })
    const fonts: WebFontFaceResolver = async (requests, basePath) =>
      requests.map((request) => ({
        family: request.family,
        weight: request.weight,
        style: request.style ?? 'normal',
        format: 'woff2',
        path: `${basePath}/inter.woff2`,
        content: new Uint8Array([1, 2, 3])
      }))

    const bundle = await exportHTMLBundle(sceneNodeToDesignDocument(graph, title.id), {
      html: 'standalone',
      assets: 'external',
      assetBasePath: 'Title.assets',
      fonts
    })
    const css = String(bundle.files.find((file) => file.path.endsWith('/pairdraw.css'))?.content)

    expect(css).toContain('@font-face')
    expect(css).toContain('font-family: "Inter"')
    expect(bundle.files.map((file) => file.path)).toContain('Title.assets/fonts/inter.woff2')
  })
})
