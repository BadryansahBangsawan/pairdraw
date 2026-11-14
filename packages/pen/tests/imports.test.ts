import { describe, expect, test } from 'bun:test'

import { importedDocument, type PenDocument, type PenImports, type PenNode } from '@pairdraw/pen'

import { expectDefined, getNodeOrThrow } from './helpers/assert'
import { parseDocument } from './helpers/document'
import { penPluginData } from './helpers/plugin-data'

const BLUE = { r: 0, g: 0, b: 1, a: 1 }

const library: PenDocument = {
  version: '2.21',
  variables: {
    'color-primary': { type: 'color', value: '#0000FF' },
    'color-action': { type: 'color', value: '$color-primary' }
  },
  children: [
    {
      id: 'button',
      type: 'frame',
      reusable: true,
      fill: '$color-action',
      children: [
        { id: 'label', type: 'text', content: '$12.00', fill: '$color-primary' },
        { id: 'icon', type: 'ref', ref: 'glyph', descendants: { dot: { fill: '$color-primary' } } }
      ]
    },
    {
      id: 'glyph',
      type: 'frame',
      reusable: true,
      children: [{ id: 'dot', type: 'ellipse', width: 4, height: 4 }]
    },
    {
      id: 'board',
      type: 'frame',
      children: [{ id: 'unused', type: 'frame', reusable: true, width: 8, height: 8 }]
    }
  ]
}

const libraryWith = (...children: PenNode[]): PenDocument => ({ version: '2.21', children })

const uiImports = (): PenImports =>
  new Map([['ui', importedDocument('ui', '../library/ui.lib.pen', library, new Map())]])

describe('importedDocument', () => {
  test('names layers, references, override paths, and variables under the alias', () => {
    const { path, doc } = importedDocument('ui', './ui.lib.pen', library, new Map())
    expect(path).toBe('./ui.lib.pen')
    expect(Object.keys(doc.variables ?? {})).toEqual(['ui:color-primary', 'ui:color-action'])
    expect(doc.variables?.['ui:color-action']?.value).toBe('$ui:color-primary')
    const [button] = doc.children
    expect(button).toMatchObject({ id: 'ui:button', fill: '$ui:color-action' })
    expect(button?.children?.[0]).toMatchObject({ id: 'ui:label', fill: '$ui:color-primary' })
    expect(button?.children?.[1]).toMatchObject({
      id: 'ui:icon',
      ref: 'ui:glyph',
      descendants: { 'ui:dot': { fill: '$ui:color-primary' } }
    })
  })

  test('keeps text that only looks like a variable', () => {
    const { doc } = importedDocument('ui', './ui.lib.pen', library, new Map())
    expect(doc.children[0]?.children?.[0]?.content).toBe('$12.00')
  })

  test('renames each step of an override path, the layers an override puts in, and slots', () => {
    const { doc } = importedDocument(
      'ui',
      './ui.lib.pen',
      libraryWith({
        id: 'card',
        type: 'ref',
        ref: 'panel',
        slot: ['button'],
        descendants: {
          'row/cell': { type: 'ref', id: 'swap', ref: 'other' },
          body: { children: [{ id: 'inner', type: 'text', content: 'Hi' }] }
        }
      }),
      new Map()
    )
    expect(doc.children[0]?.slot).toEqual(['ui:button'])
    expect(doc.children[0]?.descendants).toEqual({
      'ui:row/ui:cell': { type: 'ref', id: 'ui:swap', ref: 'ui:other' },
      'ui:body': { children: [{ id: 'ui:inner', type: 'text', content: 'Hi' }] }
    })
  })

  test('names image files apart from the importer’s, and keeps data URLs', () => {
    const { doc } = importedDocument(
      'ui',
      './ui.lib.pen',
      libraryWith(
        { id: 'photo', type: 'rectangle', fill: { type: 'image', url: 'img/logo.png' } },
        {
          id: 'inline',
          type: 'rectangle',
          fill: { type: 'image', url: 'data:image/png;base64,AA' }
        }
      ),
      new Map()
    )
    expect(doc.children[0]?.fill).toMatchObject({ url: 'pen-import:ui/img/logo.png' })
    expect(doc.children[1]?.fill).toMatchObject({ url: 'data:image/png;base64,AA' })
  })

  test('reads the documents an import imports into it, named through both aliases', () => {
    const nested = importedDocument('base', './base.lib.pen', library, new Map())
    const { doc } = importedDocument(
      'ui',
      './ui.lib.pen',
      libraryWith({ id: 'cta', type: 'ref', ref: 'base:button', reusable: true }),
      new Map([['base', nested]])
    )
    expect(doc.imports).toBeUndefined()
    expect(doc.children.map((node) => node.id)).toEqual([
      'ui:cta',
      'ui:base:button',
      'ui:base:glyph',
      'ui:base:board'
    ])
    expect(doc.children[0]?.ref).toBe('ui:base:button')
    expect(Object.keys(doc.variables ?? {})).toContain('ui:base:color-primary')
  })
})

describe('buildPenGraph with imports', () => {
  const read = (children: PenNode[]) =>
    parseDocument(children, { imports: { ui: '../library/ui.lib.pen' } }, { imports: uiImports() })

  const screen: PenNode = {
    id: 'screen',
    type: 'frame',
    fill: '$ui:color-primary',
    children: [
      {
        id: 'cta',
        type: 'ref',
        ref: 'ui:button',
        descendants: { 'ui:label': { content: 'Pay' } }
      }
    ]
  }

  test('draws instances of imported components, with their overrides', () => {
    const graph = read([screen])
    const cta = getNodeOrThrow(graph, 'cta')
    expect(cta.type).toBe('INSTANCE')
    expect(cta.componentId).toBe('ui:button')
    const label = graph.getChildren(cta.id).find((node) => node.type === 'TEXT')
    expect(label?.text).toBe('Pay')
  })

  test('resolves imported variables, through their aliases', () => {
    const graph = read([screen])
    expect(getNodeOrThrow(graph, 'screen').fills[0]?.color).toEqual(BLUE)
    expect(getNodeOrThrow(graph, 'cta').fills[0]?.color).toEqual(BLUE)
  })

  test('keeps the components the document uses on the hidden library page, and no others', () => {
    const graph = read([screen])
    expect(graph.getPages().map((page) => page.name)).toEqual(['Page 1'])
    const libraryPage = expectDefined(
      graph.getPages(true).find((page) => page.internalOnly),
      'library page'
    )
    expect(libraryPage.name).toBe('Pairdraw library definitions')
    expect(libraryPage.visible).toBe(false)
    expect(graph.getChildren(libraryPage.id).map((node) => node.id)).toEqual([
      'ui:button',
      'ui:glyph'
    ])
    expect(graph.getNode('ui:unused')).toBeUndefined()
  })

  test('marks the imported components as read-only library definitions', () => {
    const graph = read([screen])
    const button = getNodeOrThrow(graph, 'ui:button')
    expect(button.type).toBe('COMPONENT')
    expect(button.locked).toBe(true)
    expect(button.librarySource).toEqual({
      identity: { libraryId: 'pen:ui', assetKey: 'button', revisionId: '../library/ui.lib.pen' },
      sourceNodeId: null,
      readOnly: true
    })
    expect(getNodeOrThrow(graph, 'ui:glyph').librarySource?.identity.assetKey).toBe('glyph')
  })

  test('reads nothing from a library the document never uses', () => {
    const graph = read([{ id: 'plain', type: 'rectangle', width: 10, height: 10 }])
    expect(graph.getPages(true).some((page) => page.internalOnly)).toBe(false)
  })

  test('draws a ref to a component no import has as a placeholder naming it', () => {
    const graph = parseDocument(
      [{ id: 'cta', type: 'ref', ref: 'ui:button', width: 120, height: 40 }],
      { imports: { ui: '../library/ui.lib.pen' } }
    )
    const cta = getNodeOrThrow(graph, 'cta')
    expect(cta.type).toBe('FRAME')
    expect(cta.strokes[0]?.dashPattern).toEqual([4, 4])
    expect(penPluginData(cta, 'type')).toBe('ref')
    expect(penPluginData(cta, 'ref')).toBe('ui:button')
    const label = expectDefined(graph.getChildren(cta.id).at(0), 'label')
    expect(label.type).toBe('TEXT')
    expect(label.text).toBe('ui:button')
    expect(penPluginData(label, 'generated')).toBe('placeholder')
  })
})
