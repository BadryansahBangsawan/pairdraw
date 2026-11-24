import { expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import { rekeyTokenSources, type TokenSource } from '@pairdraw/scene-graph/token-sources'

/** A graph with one collection and mode, as a name-keyed format reads it back. */
function namesFixture() {
  const graph = new SceneGraph()
  const collection = graph.createCollection('Brand')
  const mode = collection.modes[0]
  if (!mode) throw new Error('no default mode')
  const variable = graph.createVariable('brand', 'COLOR', collection.id, {
    r: 1,
    g: 0,
    b: 0,
    a: 1
  })
  return { graph, collection, mode, variable }
}

function link(overrides: Partial<TokenSource>): TokenSource {
  return {
    id: 'link-app',
    kind: 'css',
    name: 'app.css',
    snapshot: {},
    ...overrides
  }
}

test('rekeys a snapshot and its mode onto the ids a name-keyed read created', () => {
  const { graph, collection, mode, variable } = namesFixture()
  const source = link({
    names: { 'old-variable': 'Brand/brand' },
    snapshot: { 'old-variable': { 'old-mode': 'color:#ff0000' } },
    modes: { Brand: { 'old-mode': mode.name } }
  })

  const [rekeyed] = rekeyTokenSources(graph, [source])

  expect(rekeyed?.names).toEqual({ [variable.id]: 'Brand/brand' })
  expect(rekeyed?.snapshot).toEqual({ [variable.id]: { [mode.modeId]: 'color:#ff0000' } })
  expect(rekeyed?.modes).toEqual({ Brand: { [mode.modeId]: mode.name } })
  expect(collection.name).toBe('Brand')
})

test('leaves the entries of variables gone from the graph keyed as they were', () => {
  const { graph, variable } = namesFixture()
  const source = link({
    names: { 'old-deleted': 'Brand/gone' },
    snapshot: { 'old-deleted': { mode: 'color:#00ff00' } }
  })

  const [rekeyed] = rekeyTokenSources(graph, [source])

  expect(rekeyed?.names).toEqual({ 'old-deleted': 'Brand/gone' })
  expect(rekeyed?.snapshot).toEqual({ 'old-deleted': { mode: 'color:#00ff00' } })
  expect(variable.name).toBe('brand')
})

test('finds a renamed variable by the names the file saved and keeps its token', () => {
  const { graph, collection, variable } = namesFixture()
  variable.name = 'brand-renamed'
  collection.name = 'Palette'
  const mode = collection.modes[0]
  if (!mode) throw new Error('no mode')
  const source = link({
    names: { 'old-variable': 'Brand/brand' },
    currentNames: { 'old-variable': 'Palette/brand-renamed' },
    snapshot: { 'old-variable': { 'old-mode': 'color:#ff0000' } },
    modes: { Palette: { 'old-mode': mode.name } }
  })

  const [rekeyed] = rekeyTokenSources(graph, [source])

  expect(rekeyed?.names).toEqual({ [variable.id]: 'Brand/brand' })
  expect(rekeyed?.snapshot).toEqual({ [variable.id]: { [mode.modeId]: 'color:#ff0000' } })
})
