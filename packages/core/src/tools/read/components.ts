import * as v from 'valibot'

import type { ComponentPropertyDefinition, SceneGraph, SceneNode } from '@open-pencil/scene-graph'
import { isPreferredComponent } from '@open-pencil/scene-graph/slots'

import { getComponentCatalog } from '#core/tools/component-catalog'
import { toolNumber, defineTool } from '#core/tools/schema'

interface SlotResult {
  name: string
  description?: string
  /** Components suggested for the slot, resolved to the document's when it has them. */
  preferred: Array<{ id: string; name: string } | { key: string }>
  preferredOnly: boolean
  minChildren?: number
  maxChildren?: number
}

interface DocumentComponentResult {
  id: string
  name: string
  type: string
  page: string
  source: 'document'
  slots?: SlotResult[]
}

/** A slot's settings, with its preferred values named by the components they stand for. */
function slotResult(
  components: readonly SceneNode[],
  definition: ComponentPropertyDefinition
): SlotResult {
  const settings = definition.slotSettings
  const slot: SlotResult = {
    name: definition.name,
    preferred: (definition.preferredValues ?? []).map((value) => {
      const component = components.find((node) => isPreferredComponent(node, [value]))
      return component ? { id: component.id, name: component.name } : { key: value }
    }),
    preferredOnly: settings?.allowPreferredValuesOnly ?? false
  }
  if (definition.description) slot.description = definition.description
  if (settings?.minChildren !== undefined) slot.minChildren = settings.minChildren
  if (settings?.maxChildren !== undefined) slot.maxChildren = settings.maxChildren
  return slot
}

/** The slots of each component, reading the document's components once, when one has a slot. */
function slotReader(graph: SceneGraph): (id: string) => SlotResult[] {
  let components: SceneNode[] | undefined
  return (id) => {
    const definitions = (graph.getNode(id)?.componentPropertyDefinitions ?? []).filter(
      (definition) => definition.type === 'SLOT'
    )
    if (definitions.length === 0) return []
    components ??= [...graph.getAllNodes()].filter(
      (node) => node.type === 'COMPONENT' || node.type === 'COMPONENT_SET'
    )
    const found = components
    return definitions.map((definition) => slotResult(found, definition))
  }
}

interface LibraryComponentResult {
  libraryId: string
  libraryName: string
  revisionId: string
  assetKey: string
  name: string
  type: string
  description: string
  source: 'library'
  enabled: boolean
  priority: number
}

export const getComponents = defineTool({
  name: 'get_components',
  description:
    'List reusable components from the document and enabled component libraries, optionally filtered by name. A document component with slots lists each slot with the components suggested for it (preferred) and whether it takes only those; fill a slot with instances of its preferred components.',
  execution: { kind: 'async', mutation: 'none' },
  input: v.strictObject({
    name: v.optional(
      v.pipe(v.string(), v.description('Filter by name (case-insensitive substring)'))
    ),
    source: v.optional(
      v.pipe(v.picklist(['all', 'document', 'libraries']), v.description('Component source')),
      'all'
    ),
    library_id: v.optional(
      v.pipe(v.string(), v.description('Filter library components by library ID'))
    ),
    limit: v.optional(
      toolNumber(
        v.pipe(v.number(), v.integer(), v.minValue(0), v.description('Max results (default: 50)'))
      )
    )
  }),
  execute: async (figma, args) => {
    const limit = args.limit ?? 50
    const source = args.source
    const nameFilter = args.name?.toLowerCase()
    const documentComponents: DocumentComponentResult[] = []
    const componentSlots = slotReader(figma.graph)

    if (source !== 'libraries') {
      for (const page of figma.root.children) {
        if (documentComponents.length >= limit) break
        page.findAll((node) => {
          if (documentComponents.length >= limit) return false
          if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') return false
          if (nameFilter && !node.name.toLowerCase().includes(nameFilter)) return false
          const slots = componentSlots(node.id)
          documentComponents.push({
            id: node.id,
            name: node.name,
            type: node.type,
            page: page.name,
            source: 'document',
            ...(slots.length > 0 ? { slots } : {})
          })
          return false
        })
      }
    }

    const catalog = getComponentCatalog(figma.graph)
    const libraryComponents: LibraryComponentResult[] = []
    if (source !== 'document' && catalog) {
      const assets = await catalog.listComponents({
        name: args.name,
        libraryId: args.library_id,
        enabledOnly: true
      })
      libraryComponents.push(
        ...assets.map(({ libraryId, libraryName, revisionId, enabled, priority, asset }) => ({
          libraryId,
          libraryName,
          revisionId,
          assetKey: asset.key,
          name: asset.name,
          type: asset.type,
          description: asset.description,
          source: 'library' as const,
          enabled,
          priority
        }))
      )
    }

    const components = [...libraryComponents, ...documentComponents]
      .sort((left, right) => {
        const leftPriority = 'priority' in left ? left.priority : -1
        const rightPriority = 'priority' in right ? right.priority : -1
        return rightPriority - leftPriority || left.name.localeCompare(right.name)
      })
      .slice(0, limit)
    return { count: components.length, components }
  }
})
