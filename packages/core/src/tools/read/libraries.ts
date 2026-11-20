import { groupBy, isPlainObject } from 'es-toolkit'
import * as v from 'valibot'

import { prepareSlotInsertion } from '#core/figma-api/slots'
import { getComponentCatalog } from '#core/tools/component-catalog'
import { toolNumber, defineTool } from '#core/tools/schema'

const variantValuesSchema = v.pipe(
  v.string(),
  v.parseJson(),
  // A record also takes an array, as its indices.
  v.check(isPlainObject, 'Expected a JSON object'),
  v.record(v.string(), v.string())
)

export const listLibraries = defineTool({
  name: 'list_libraries',
  description:
    'List available published component libraries and each component asset key, name, and type. Pass a key to insert_library_component. A library does not have to be enabled to be listed.',
  execution: { kind: 'async', mutation: 'none' },
  exposure: { webmcp: false },
  input: v.strictObject({}),
  execute: async (figma) => {
    const catalog = getComponentCatalog(figma.graph)
    if (!catalog) return { count: 0, libraries: [] }
    const [libraries, components] = await Promise.all([
      catalog.listLibraries(),
      // Enabled-only would hide the keys of a library the document has not turned on.
      catalog.listComponents({ enabledOnly: false })
    ])
    const byLibrary = groupBy(components, (component) => component.libraryId)
    return {
      count: libraries.length,
      libraries: libraries.map((library) => ({
        ...library,
        assets: (byLibrary[library.libraryId] ?? []).map((component) => ({
          key: component.asset.key,
          name: component.asset.name,
          type: component.asset.type
        }))
      }))
    }
  }
})

export const insertLibraryComponent = defineTool({
  name: 'insert_library_component',
  description:
    'Insert a reusable component from an enabled library by stable library and asset identity.',

  execution: { kind: 'async', mutation: 'document' },
  content: 'imported',
  input: v.strictObject({
    library_id: v.pipe(v.string(), v.description('Library ID')),
    revision_id: v.optional(v.pipe(v.string(), v.description('Pinned revision ID'))),
    asset_key: v.pipe(v.string(), v.description('Stable asset key')),
    parent_id: v.optional(v.pipe(v.string(), v.description('Optional parent node ID'))),
    x: v.optional(toolNumber(v.pipe(v.number(), v.description('X position')))),
    y: v.optional(toolNumber(v.pipe(v.number(), v.description('Y position')))),
    variant_values: v.optional(
      v.pipe(v.string(), v.description('Optional JSON object of variant property values'))
    )
  }),
  execute: async (figma, args) => {
    if (args.parent_id)
      prepareSlotInsertion(figma.graph, args.parent_id, 'insert_library_component')
    const catalog = getComponentCatalog(figma.graph)
    if (!catalog) throw new Error('No component library catalog is configured')
    let variantValues: Record<string, string> | undefined
    if (args.variant_values) {
      const parsed = v.safeParse(variantValuesSchema, args.variant_values)
      if (!parsed.success) {
        throw new TypeError(
          `variant_values must be a JSON object of strings: ${v.summarize(parsed.issues)}`
        )
      }
      variantValues = parsed.output
    }
    return catalog.insertComponent({
      libraryId: args.library_id,
      revisionId: args.revision_id,
      assetKey: args.asset_key,
      parentId: args.parent_id,
      x: args.x,
      y: args.y,
      variantValues
    })
  }
})
