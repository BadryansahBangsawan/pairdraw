import { describe, expect, test } from 'bun:test'

import { exportFigFile, parseFigFile } from '@pairdraw/core/io/formats/fig'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import { SceneGraph } from '@pairdraw/scene-graph'
import { readTokenSources, tokenSourcesPluginData } from '@pairdraw/scene-graph/token-sources'

describe('.fig round trip of linked token sources', () => {
  test('keeps the link and the ids its snapshot names, and adds no variables', async () => {
    await initCodec()
    const graph = new SceneGraph()
    const theme = graph.createCollection('Theme')
    const brand = graph.createVariable('brand', 'COLOR', theme.id, { r: 1, g: 0, b: 0, a: 1 })
    const source = {
      id: 'app-css',
      kind: 'css' as const,
      name: 'app.css',
      path: 'src/app.css',
      snapshot: { [brand.id]: { [theme.defaultModeId]: '#FF0000' } }
    }
    graph.updateNode(graph.rootId, { pluginData: tokenSourcesPluginData(graph, [source]) })

    const reopened = await parseFigFile((await exportFigFile(graph)).slice().buffer)
    expect(readTokenSources(reopened)).toEqual([source])
    expect([...reopened.variables.keys()]).toEqual([brand.id])
    expect(reopened.variableCollections.get(theme.id)?.defaultModeId).toBe(theme.defaultModeId)
  })
})
