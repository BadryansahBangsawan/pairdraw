import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { registerComponentCatalog } from '@pairdraw/core/tools'
import { insertLibraryComponent, listLibraries } from '@pairdraw/core/tools/read'
import { SceneGraph } from '@pairdraw/scene-graph'

/** Inserts through a catalog that records the variant values it is given. */
function insertWithVariantValues(variantValues: string) {
  const graph = new SceneGraph()
  const received: Array<Record<string, string> | undefined> = []
  registerComponentCatalog(graph, {
    listLibraries: async () => [],
    listComponents: async () => [],
    insertComponent: async (input) => {
      received.push(input.variantValues)
      return { id: '0:instance', componentId: '0:component' }
    }
  })
  const result = insertLibraryComponent.execute(new FigmaAPI(graph), {
    library_id: 'preferred',
    asset_key: 'button',
    variant_values: variantValues
  })
  return { result, received }
}

describe('list_libraries asset keys', () => {
  test('names each published asset even when the library is not enabled', async () => {
    const graph = new SceneGraph()
    registerComponentCatalog(graph, {
      listLibraries: async () => [
        {
          libraryId: 'pairdraw-basics',
          name: 'Basics',
          latestRevisionId: 'rev-1',
          publishedAt: '2026-01-01T00:00:00.000Z',
          assetCount: 1
        }
      ],
      listComponents: async (input) => {
        expect(input.enabledOnly).toBe(false)
        return [
          {
            libraryId: 'pairdraw-basics',
            libraryName: 'Basics',
            revisionId: 'rev-1',
            enabled: false,
            priority: 0,
            asset: {
              key: 'button',
              type: 'COMPONENT',
              name: 'Button',
              description: '',
              sourceNodeId: '1:2',
              contentHash: 'abc'
            }
          }
        ]
      },
      insertComponent: async () => {
        throw new Error('insert is not part of listing')
      }
    })

    await expect(listLibraries.execute(new FigmaAPI(graph), {})).resolves.toEqual({
      count: 1,
      libraries: [
        {
          libraryId: 'pairdraw-basics',
          name: 'Basics',
          latestRevisionId: 'rev-1',
          publishedAt: '2026-01-01T00:00:00.000Z',
          assetCount: 1,
          assets: [{ key: 'button', name: 'Button', type: 'COMPONENT' }]
        }
      ]
    })
  })
})

describe('insert_library_component variant values', () => {
  test('passes a JSON object of strings to the catalog', async () => {
    const { result, received } = insertWithVariantValues('{"Size":"Large"}')
    await result
    expect(received).toEqual([{ Size: 'Large' }])
  })

  test.each([
    ['malformed JSON', '{"Size":'],
    ['a JSON array', '["Large"]'],
    ['a value that is not a string', '{"Size":2}']
  ])('refuses %s and names the argument', async (_label, variantValues) => {
    const { result, received } = insertWithVariantValues(variantValues)
    await expect(result).rejects.toThrow('variant_values')
    expect(received).toEqual([])
  })
})
