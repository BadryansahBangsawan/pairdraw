import { describe, expect, test } from 'bun:test'

import { applyDocumentMetadata } from '#fig/document/metadata'

import { SceneGraph } from '@pairdraw/scene-graph'
import { PAIRDRAW_PLUGIN_DATA, PAIRDRAW_PLUGIN_ID } from '@pairdraw/scene-graph/plugin-data'

function enabledLibraries(value: string) {
  const graph = new SceneGraph()
  applyDocumentMetadata(graph, {
    pluginData: [
      { pluginID: PAIRDRAW_PLUGIN_ID, key: PAIRDRAW_PLUGIN_DATA.enabledLibraries.key, value }
    ]
  })
  return [...graph.enabledLibraries.values()]
}

describe('document metadata', () => {
  test('restores valid enabled libraries and skips invalid entries', () => {
    expect(
      enabledLibraries(
        JSON.stringify([
          { libraryId: 'design-system', revisionId: 'r1', enabled: true },
          { libraryId: 'icons', revisionId: 'r2', enabled: 'yes' },
          { libraryId: 'broken', revisionId: 3 },
          null
        ])
      )
    ).toEqual([
      { libraryId: 'design-system', revisionId: 'r1', enabled: true },
      { libraryId: 'icons', revisionId: 'r2', enabled: false }
    ])
  })

  test('ignores malformed or non-array enabled libraries', () => {
    expect(enabledLibraries('{not json')).toEqual([])
    expect(
      enabledLibraries(JSON.stringify({ libraryId: 'design-system', revisionId: 'r1' }))
    ).toEqual([])
  })
})
