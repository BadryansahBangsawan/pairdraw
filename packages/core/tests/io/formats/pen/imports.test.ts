import { describe, expect, test } from 'bun:test'

import { getNodeOrThrow } from '#core-tests/helpers/assert'
import { uniq } from 'es-toolkit/array'
import { toUint8Array } from 'js-base64'
import { dirname, join } from 'pathe'

import { IORegistry, penFormat, type ReadDocumentInput } from '@pairdraw/core/io'

const io = new IORegistry([penFormat])

const BLUE = { r: 0, g: 0, b: 1, a: 1 }

// A 2 × 1 PNG and a 1 × 1 PNG.
const WIDE_PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADElEQVR4nGP8zwACAAYIAQFazwZIAAAAAElFTkSuQmCC'
)
const DOT_PNG = toUint8Array(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
)

function penBytes(fields: Record<string, unknown>) {
  return new TextEncoder().encode(JSON.stringify({ version: '2.21', ...fields }))
}

type Files = Partial<Record<string, Record<string, unknown> | Uint8Array>>

/**
 * A host holding `files` by their path from the folder the opened document is in, as a desktop
 * host reads them: each document's images and imports relative to that document. Records what
 * it is asked for.
 */
function host(files: Files, asked: string[] = []) {
  const read = (path: string) => {
    asked.push(path)
    const file = files[path]
    if (!file) return null
    return file instanceof Uint8Array ? file : penBytes(file)
  }
  const open = (at: string): Pick<ReadDocumentInput, 'readAsset' | 'openImport'> => ({
    readAsset: async (path) => read(join(dirname(at), path)),
    openImport: async (path) => {
      const target = join(dirname(at), path)
      const data = read(target)
      return data ? { name: target, data, ...open(target) } : null
    }
  })
  return (name: string, fields: Record<string, unknown>): ReadDocumentInput => ({
    name,
    data: penBytes(fields),
    ...open(name)
  })
}

const screen = {
  imports: { ui: '../library/ui.lib.pen' },
  children: [
    {
      id: 'screen',
      type: 'frame',
      fill: '$ui:color-primary',
      children: [{ id: 'cta', type: 'ref', ref: 'ui:button' }]
    }
  ]
}

describe('penFormat.readDocument — imports', () => {
  test('opens imports relative to the document, and theirs relative to them', async () => {
    const asked: string[] = []
    const open = host(
      {
        'library/ui.lib.pen': {
          imports: { base: './base.lib.pen' },
          children: [
            {
              id: 'button',
              type: 'frame',
              reusable: true,
              children: [{ id: 'face', type: 'ref', ref: 'base:pill' }]
            }
          ]
        },
        'library/base.lib.pen': {
          variables: { 'color-primary': { type: 'color', value: '#0000FF' } },
          children: [
            { id: 'pill', type: 'frame', reusable: true, fill: '$color-primary', width: 40 }
          ]
        }
      },
      asked
    )
    const { graph, warnings } = await io.readDocument(open('screens/checkout.pen', screen))
    // The screen's own fill names a variable no imported library defines; its components draw.
    expect(warnings).toEqual([{ kind: 'unknown-variable', names: ['ui:color-primary'] }])
    expect([...asked].sort()).toEqual(['library/base.lib.pen', 'library/ui.lib.pen'])
    const cta = getNodeOrThrow(graph, 'cta')
    expect(cta.componentId).toBe('ui:button')
    expect(graph.getChildren(cta.id).at(0)?.fills[0]?.color).toEqual(BLUE)
    expect(getNodeOrThrow(graph, 'ui:base:pill').librarySource?.identity).toEqual({
      libraryId: 'pen:ui',
      assetKey: 'base:pill',
      revisionId: '../library/ui.lib.pen'
    })
  })

  test('lays out the library components the document uses', async () => {
    const open = host({
      'library/ui.lib.pen': {
        children: [
          {
            id: 'button',
            type: 'frame',
            reusable: true,
            layout: 'horizontal',
            padding: 10,
            children: [{ id: 'box', type: 'rectangle', width: 30, height: 20 }]
          }
        ]
      }
    })
    const { graph } = await io.readDocument(open('screens/checkout.pen', screen))
    const button = getNodeOrThrow(graph, 'ui:button')
    expect([button.width, button.height]).toEqual([50, 40])
    expect([getNodeOrThrow(graph, 'cta').width, getNodeOrThrow(graph, 'cta').height]).toEqual([
      50, 40
    ])
  })

  test('reads a document that imports itself through others once', async () => {
    const asked: string[] = []
    const open = host(
      {
        'library/ui.lib.pen': {
          imports: { again: './ui.lib.pen' },
          variables: { 'color-primary': { type: 'color', value: '#0000FF' } },
          children: [{ id: 'button', type: 'frame', reusable: true }]
        }
      },
      asked
    )
    const { graph } = await io.readDocument(open('screens/checkout.pen', screen))
    expect(asked).toEqual(['library/ui.lib.pen'])
    expect(getNodeOrThrow(graph, 'screen').fills[0]?.color).toEqual(BLUE)
  })
  test('reads a library that imports the opened document back without reading the document again', async () => {
    const app = {
      imports: { lib: '../shared/lib.pen' },
      variables: { 'color-app': { type: 'color', value: '#0000FF' } },
      children: [{ id: 'cta', type: 'ref', ref: 'lib:button' }]
    }
    const open = host({
      'app/A.pen': app,
      'shared/lib.pen': {
        imports: { app: '../app/A.pen' },
        children: [{ id: 'button', type: 'frame', reusable: true }]
      }
    })
    const { graph } = await io.readDocument(open('app/A.pen', app))
    expect(getNodeOrThrow(graph, 'cta').componentId).toBe('lib:button')
    expect(graph.getNode('lib:app:cta')).toBeUndefined()
    expect([...graph.variables.values()].map((variable) => variable.name)).toEqual(['color-app'])
  })

  test('opens a library several of its imports share once', async () => {
    const asked: string[] = []
    const library = (name: string) => ({
      imports: { [`${name}1`]: `./${name}1.pen`, [`${name}2`]: `./${name}2.pen` },
      children: [{ id: 'button', type: 'frame', reusable: true }]
    })
    const files: Files = { 'base.pen': { children: [] } }
    for (const name of ['a', 'b', 'c', 'd']) {
      for (const n of [1, 2]) {
        const next = String.fromCharCode(name.charCodeAt(0) + 1)
        files[`${name}${n}.pen`] =
          name === 'd' ? { imports: { base: './base.pen' }, children: [] } : library(next)
      }
    }
    const open = host(files, asked)
    const { warnings } = await io.readDocument(open('root.pen', library('a')))
    expect(warnings).toBeUndefined()
    expect(asked.toSorted()).toEqual(uniq(asked).toSorted())
  })
})

describe('penFormat.readDocument — imports it cannot read', () => {
  test('warns that a host without file access cannot open imports, drawing placeholders', async () => {
    const { graph, warnings } = await io.readDocument({
      name: 'checkout.pen',
      data: penBytes(screen)
    })
    expect(warnings).toEqual([
      { kind: 'unresolved-imports', reason: 'no-file-access', paths: ['../library/ui.lib.pen'] }
    ])
    const cta = getNodeOrThrow(graph, 'cta')
    expect(cta.type).toBe('FRAME')
    expect(cta.strokes[0]?.dashPattern).toEqual([4, 4])
    expect(graph.getChildren(cta.id).map((node) => node.text)).toEqual(['ui:button'])
    expect(graph.getPages(true).map((page) => page.name)).toEqual(['Page 1'])
  })

  test('names an import as the document writes it', async () => {
    const { warnings } = await io.readDocument({
      name: 'checkout.pen',
      data: penBytes({ ...screen, imports: { ui: './library/ui.lib.pen', abs: '/libs/x.pen' } })
    })
    expect(warnings).toEqual([
      {
        kind: 'unresolved-imports',
        reason: 'no-file-access',
        paths: ['./library/ui.lib.pen', '/libs/x.pen']
      }
    ])
  })

  test('warns about imports that are missing or no .pen document, by path from the document', async () => {
    const open = host({
      'library/ui.lib.pen': {
        imports: { base: './base.lib.pen', broken: './broken.lib.pen' },
        children: [{ id: 'button', type: 'frame', reusable: true }]
      },
      'library/broken.lib.pen': new TextEncoder().encode('not a document')
    })
    const { graph, warnings } = await io.readDocument(open('screens/checkout.pen', screen))
    expect(warnings).toEqual([
      {
        kind: 'unresolved-imports',
        reason: 'unreadable',
        paths: ['../library/base.lib.pen', '../library/broken.lib.pen']
      }
    ])
    expect(getNodeOrThrow(graph, 'cta').componentId).toBe('ui:button')
  })
})

describe('penFormat.readDocument — imported images', () => {
  const logo = (id: string) => ({
    id,
    type: 'rectangle',
    reusable: true,
    width: 20,
    height: 10,
    fill: { type: 'image', url: 'img/logo.png' }
  })

  test('reads an imported component’s image beside its library, apart from the document’s', async () => {
    const asked: string[] = []
    const open = host(
      {
        'screens/img/logo.png': WIDE_PNG,
        'library/ui.lib.pen': { children: [logo('logo'), logo('unused')] },
        'library/img/logo.png': DOT_PNG
      },
      asked
    )
    const { graph } = await io.readDocument(
      open('screens/checkout.pen', {
        imports: { ui: '../library/ui.lib.pen' },
        children: [logo('own'), { id: 'cta', type: 'ref', ref: 'ui:logo' }]
      })
    )
    expect([...asked].sort()).toEqual([
      'library/img/logo.png',
      'library/ui.lib.pen',
      'screens/img/logo.png'
    ])
    const own = getNodeOrThrow(graph, 'own').fills[0]?.imageHash
    const imported = getNodeOrThrow(graph, 'cta').fills[0]?.imageHash
    expect(own).toBeDefined()
    expect(imported).not.toBe(own)
    expect(graph.images.get(imported ?? '')).toEqual(DOT_PNG)
  })
})
