import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'
import {
  readTokenSources,
  tokenSourcesPluginData,
  type TokenSource
} from '@pairdraw/scene-graph/token-sources'

function source(id: string, patch: Partial<TokenSource> = {}): TokenSource {
  return {
    id,
    kind: 'css',
    name: 'app.css',
    path: '../web/src/app.css',
    syncedAt: '2026-11-21T10:00:00.000Z',
    snapshot: { '1:2': { '1:3': '#FF0000' } },
    ...patch
  }
}

function store(graph: SceneGraph, sources: readonly TokenSource[]) {
  graph.updateNode(graph.rootId, { pluginData: tokenSourcesPluginData(graph, sources) })
}

describe('linked token sources', () => {
  test('a document without any reads none', () => {
    expect(readTokenSources(new SceneGraph())).toEqual([])
  })

  test('are kept on the document node beside other plugin data', () => {
    const graph = new SceneGraph()
    graph.updateNode(graph.rootId, {
      pluginData: [{ pluginId: 'other', key: 'note', value: 'kept' }]
    })
    store(graph, [source('a')])
    expect(readTokenSources(graph)).toEqual([source('a')])
    expect(graph.getNode(graph.rootId)?.pluginData).toContainEqual({
      pluginId: 'other',
      key: 'note',
      value: 'kept'
    })
    store(graph, [])
    expect(readTokenSources(graph)).toEqual([])
  })

  test('read none whose stored path is not relative to the document', () => {
    const graph = new SceneGraph()
    graph.updateNode(graph.rootId, {
      pluginData: [
        {
          pluginId: 'pairdraw',
          key: 'tokenSources',
          value: JSON.stringify([
            source('a'),
            source('b', { path: '/Users/ada/web/app.css' }),
            source('c', { path: 'C:\\web\\app.css' })
          ])
        }
      ]
    })
    expect(readTokenSources(graph).map((entry) => entry.id)).toEqual(['a'])
  })

  test('skip entries that cannot be read', () => {
    const graph = new SceneGraph()
    graph.updateNode(graph.rootId, {
      pluginData: [
        {
          pluginId: 'pairdraw',
          key: 'tokenSources',
          value: JSON.stringify([source('a'), { id: 3 }])
        }
      ]
    })
    expect(readTokenSources(graph).map((entry) => entry.id)).toEqual(['a'])
  })
})

describe('writing linked token sources', () => {
  test('keeps a link but never an absolute path, on any platform', () => {
    const graph = new SceneGraph()
    store(graph, [
      source('posix', { path: '/Users/ada/web/app.css' }),
      source('drive', { path: 'D:/web/app.css' }),
      source('backslash-drive', { path: 'D:\\web\\app.css' }),
      source('unc', { path: '\\\\server\\share\\app.css' }),
      source('unc-slash', { path: '//server/share/app.css' }),
      source('file-url', { path: 'file:///Users/ada/web/app.css' }),
      source('home', { path: '~/web/app.css' }),
      source('relative', { path: '../web/app.css' })
    ])
    const read = readTokenSources(graph)
    expect(read.map((entry) => [entry.id, entry.path])).toEqual([
      ['posix', undefined],
      ['drive', undefined],
      ['backslash-drive', undefined],
      ['unc', undefined],
      ['unc-slash', undefined],
      ['file-url', undefined],
      ['home', undefined],
      ['relative', '../web/app.css']
    ])
  })
})
