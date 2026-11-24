import { describe, expect, test } from 'bun:test'

import { parsePenFile, writePenDocument } from '@pairdraw/pen'
import { SceneGraph, type Variable } from '@pairdraw/scene-graph'
import { readTokenSources } from '@pairdraw/scene-graph/token-sources'

import { syncTokenFiles, type DesignTokenSourceFile } from '#core/io/formats/design-tokens'

const RED = ':root { --brand: #ff0000; }'
const GREEN = ':root { --brand: #00aa00; }'
const BLUE = ':root { --brand: #0000ff; }'
const GREEN_ON_CANVAS = { r: 0, g: 0.5, b: 0, a: 1 }
const MULTI = ':root { --brand: #ff0000; --space: 4px; } .dark { --brand: #aa0000; }'
const MULTI_CHANGED = ':root { --brand: #00ff00; --space: 4px; } .dark { --brand: #00aa00; }'

const files = (text: string): DesignTokenSourceFile[] => [{ path: 'app.css', text }]

function variableNamed(graph: SceneGraph, name: string): Variable {
  const found = [...graph.variables.values()].find((variable) => variable.name === name)
  if (!found) throw new Error(`No variable ${name}`)
  return found
}

function tokenNames(graph: SceneGraph): string[] {
  return [...graph.variables.values()].map((variable) => variable.name).sort()
}

describe('a .pen document’s token link', () => {
  test('survives a save and a reopen, so a file-only change pulls', () => {
    const graph = new SceneGraph()
    expect(syncTokenFiles(graph, files(RED), { path: 'app.css' }).applied).toBe(1)

    const reopened = parsePenFile(writePenDocument(graph))

    expect(readTokenSources(reopened).map(({ name, path }) => [name, path])).toEqual([
      ['app.css', 'app.css']
    ])
    const pulled = syncTokenFiles(reopened, files(GREEN), { path: 'app.css' })
    expect(pulled.applied).toBe(1)
    expect(pulled.left).toEqual([])
  })

  test('keeps every mode of the snapshot through a reopen', () => {
    const graph = new SceneGraph()
    syncTokenFiles(graph, files(MULTI), { path: 'app.css' })
    const reopened = parsePenFile(writePenDocument(graph))

    const pulled = syncTokenFiles(reopened, files(MULTI_CHANGED), { path: 'app.css' })

    expect(pulled.left).toEqual([])
    expect(pulled.applied).toBe(2)
  })

  test('still tells a canvas edit from a file-only change after a reopen', () => {
    const graph = new SceneGraph()
    syncTokenFiles(graph, files(RED), { path: 'app.css' })
    const reopened = parsePenFile(writePenDocument(graph))
    const brand = variableNamed(reopened, 'brand')
    const [mode] = Object.keys(brand.valuesByMode)
    if (!mode) throw new Error('brand has no mode')
    brand.valuesByMode[mode] = GREEN_ON_CANVAS

    const sync = syncTokenFiles(reopened, files(BLUE), { path: 'app.css' })

    expect(sync.applied).toBe(0)
    expect(sync.left.map((line) => line.kind)).toEqual(['conflict'])
  })

  test('keeps the link after a variable is renamed', () => {
    const graph = new SceneGraph()
    syncTokenFiles(graph, files(RED), { path: 'app.css' })
    variableNamed(graph, 'brand').name = 'brand-renamed'
    const reopened = parsePenFile(writePenDocument(graph))
    const source = readTokenSources(reopened)[0]
    const renamed = variableNamed(reopened, 'brand-renamed')
    if (!source) throw new Error('no link')

    // The saved names find the renamed variable's new id; the link still stands for the token it
    // synced, `Tokens/brand`, so the code side keeps its identity.
    expect(source.names?.[renamed.id]).toBe('Tokens/brand')
    expect(source.snapshot[renamed.id]).toBeDefined()
  })

  test('keeps the link after its collection is renamed', () => {
    const graph = new SceneGraph()
    syncTokenFiles(graph, files(RED), { path: 'app.css' })
    const collection = [...graph.variableCollections.values()][0]
    if (!collection) throw new Error('no collection')
    collection.name = 'Brand colors'
    const reopened = parsePenFile(writePenDocument(graph))
    const source = readTokenSources(reopened)[0]
    if (!source) throw new Error('no link')

    const brand = variableNamed(reopened, 'brand')
    expect(source.snapshot[brand.id]).toBeDefined()
    expect(source.names?.[brand.id]).toBe('Tokens/brand')
  })

  test('pulls a file-only change after a variable is renamed and reopened', () => {
    const graph = new SceneGraph()
    syncTokenFiles(graph, files(MULTI), { path: 'app.css' })
    variableNamed(graph, 'brand').name = 'brand-renamed'
    const reopened = parsePenFile(writePenDocument(graph))

    const pulled = syncTokenFiles(reopened, files(MULTI_CHANGED), { path: 'app.css' })

    expect(pulled.left).toEqual([])
    expect(pulled.applied).toBe(2)
    expect(tokenNames(reopened)).toEqual(['brand-renamed', 'space'])
    // The link keeps naming the code token, not the variable's new name.
    const source = readTokenSources(reopened)[0]
    expect(source?.names?.[variableNamed(reopened, 'brand-renamed').id]).toBe('Theme/brand')
  })

  test('pulls a file-only change after its collection is renamed and reopened', () => {
    const graph = new SceneGraph()
    syncTokenFiles(graph, files(MULTI), { path: 'app.css' })
    const collection = [...graph.variableCollections.values()][0]
    if (!collection) throw new Error('no collection')
    collection.name = 'Brand colors'
    const reopened = parsePenFile(writePenDocument(graph))

    const pulled = syncTokenFiles(reopened, files(MULTI_CHANGED), { path: 'app.css' })

    expect(pulled.left).toEqual([])
    expect(pulled.applied).toBe(2)
    expect(tokenNames(reopened)).toEqual(['brand', 'space'])
    const source = readTokenSources(reopened)[0]
    expect(source?.names?.[variableNamed(reopened, 'brand').id]).toBe('Brand colors/brand')
  })

  test('pulls a file-only change after a mode is renamed and reopened', () => {
    const graph = new SceneGraph()
    syncTokenFiles(graph, files(MULTI), { path: 'app.css' })
    const collection = [...graph.variableCollections.values()][0]
    const mode = collection?.modes.at(-1)
    if (!collection || !mode) throw new Error('no mode')
    mode.name = 'Night'
    const reopened = parsePenFile(writePenDocument(graph))

    const pulled = syncTokenFiles(reopened, files(MULTI_CHANGED), { path: 'app.css' })

    expect(pulled.left).toEqual([])
    expect(pulled.applied).toBe(2)
    expect(tokenNames(reopened)).toEqual(['brand', 'space'])
  })

  test('keeps the link after a mode is renamed', () => {
    const graph = new SceneGraph()
    syncTokenFiles(graph, files(MULTI), { path: 'app.css' })
    const collection = [...graph.variableCollections.values()][0]
    const mode = collection?.modes.at(-1)
    if (!collection || !mode) throw new Error('no mode')
    mode.name = 'Night'
    const reopened = parsePenFile(writePenDocument(graph))
    const source = readTokenSources(reopened)[0]
    if (!source) throw new Error('no link')

    const reopenedCollection = [...reopened.variableCollections.values()][0]
    const night = reopenedCollection?.modes.find((entry) => entry.name === 'Night')
    const brand = variableNamed(reopened, 'brand')
    if (!reopenedCollection || !night) throw new Error('no Night mode')
    expect(source.modes?.[reopenedCollection.name]?.[night.modeId]).toBe('Night')
    expect(source.snapshot[brand.id]?.[night.modeId]).toBeDefined()

    const pulled = syncTokenFiles(reopened, files(MULTI_CHANGED), { path: 'app.css' })
    expect(pulled.applied).toBe(2)
    expect(pulled.left).toEqual([])
  })
})
