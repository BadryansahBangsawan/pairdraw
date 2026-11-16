import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { registerComponentCatalog } from '@pairdraw/core/tools'
import { insertLibraryComponent } from '@pairdraw/core/tools/read'
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
