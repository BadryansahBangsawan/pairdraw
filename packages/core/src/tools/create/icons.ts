import * as v from 'valibot'

import { iconOptionsSchema, type IconOptions } from '@pairdraw/scene-graph/icons'

import { prepareSlotInsertion } from '#core/figma-api/slots'
import { placeIcon } from '#core/icons'
import { defineTool, parseToolColor, toolNumber } from '#core/tools/schema'

export const fetchIconsTool = defineTool({
  name: 'fetch_icons',
  exposure: { webmcp: false },
  description:
    'Pre-fetch icons from Iconify into cache. Batches by prefix (one HTTP request per set). Call this once with all needed icons, then use insert_icon to place them instantly. Popular sets: lucide (outline), mdi (filled), heroicons, tabler, solar, mingcute, ri (remix).',
  execution: { kind: 'async', mutation: 'none' },
  capabilities: ['network:access'],
  input: v.strictObject({
    names: v.pipe(
      v.array(v.string()),
      v.minLength(1),
      v.description('Icon names as prefix:name (e.g. ["lucide:heart", "lucide:home", "mdi:star"])')
    ),
    size: v.optional(
      toolNumber(v.pipe(v.number(), v.description('Icon size in pixels (default: 24)')))
    )
  }),
  execute: async (figma, args) => {
    const size = args.size ?? 24
    try {
      const icons = await figma.icons.icons(args.names, size)
      const fetched = [...icons.keys()]
      const notFound = args.names.filter((name) => !icons.has(name))
      const result: Record<string, unknown> = { fetched, count: fetched.length }
      if (notFound.length > 0) result.not_found = notFound
      return result
    } catch (e) {
      return { error: (e as Error).message }
    }
  }
})

/**
 * How a set with options draws its icons, as Material Symbols' variable axes. Sets without
 * options ignore them; a value outside an axis is clamped to it.
 */
const iconOptionInputs = {
  weight: v.optional(
    toolNumber(
      v.pipe(
        v.number(),
        v.description('Stroke weight, 100 to 700 (Material Symbols; default: 400)')
      )
    )
  ),
  fill: v.optional(
    v.pipe(v.boolean(), v.description('Filled rather than outlined (Material Symbols)'))
  ),
  grade: v.optional(
    toolNumber(
      v.pipe(
        v.number(),
        v.description('Grade, -50 to 200: thickness without resizing (Material Symbols)')
      )
    )
  ),
  optical_size: v.optional(
    toolNumber(
      v.pipe(v.number(), v.description('Optical size, 20 to 48 (Material Symbols; default: 24)'))
    )
  ),
  options: v.optional(
    v.pipe(
      iconOptionsSchema,
      v.description(
        'Other options of a set that has them, by key, such as an SF Symbols weight or scale'
      )
    )
  )
}

/** The named options as the axes a set reads, over any given by key. */
function iconOptions(args: {
  weight?: number
  fill?: boolean
  grade?: number
  optical_size?: number
  options?: IconOptions
}): IconOptions | undefined {
  const options: IconOptions = { ...args.options }
  if (args.optical_size !== undefined) options.opsz = args.optical_size
  if (args.weight !== undefined) options.wght = args.weight
  if (args.fill !== undefined) options.FILL = args.fill ? 1 : 0
  if (args.grade !== undefined) options.GRAD = args.grade
  return Object.keys(options).length > 0 ? options : undefined
}

export const insertIcon = defineTool({
  name: 'insert_icon',

  description:
    'Insert one or more vector icons onto the canvas. Pass a single name or multiple names to batch-insert into the same parent. If already cached by fetch_icons — instant, no network request. Material Symbols icons (material-symbols-outlined, -rounded, -sharp) take weight, fill, grade, and optical_size; the icon keeps them when swapped.',
  execution: { kind: 'async', mutation: 'document' },
  content: 'imported',
  capabilities: ['document:write', 'network:access'],
  input: v.strictObject({
    names: v.optional(
      v.pipe(
        v.array(v.string()),
        v.minLength(1),
        v.description(
          'Icon names as prefix:name (e.g. ["lucide:heart"] or ["lucide:heart","lucide:home","lucide:star"])'
        )
      )
    ),
    name: v.optional(
      v.pipe(v.string(), v.description('Single icon name (shorthand for names with one icon)'))
    ),
    size: v.optional(
      toolNumber(v.pipe(v.number(), v.description('Icon size in pixels (default: 24)')))
    ),
    color: v.optional(
      v.pipe(v.string(), v.description('Icon color hex (replaces currentColor). Default: #000000'))
    ),
    parent_id: v.optional(v.pipe(v.string(), v.description('Parent node ID for all icons'))),
    x: v.optional(toolNumber(v.pipe(v.number(), v.description('X position in the parent')))),
    y: v.optional(toolNumber(v.pipe(v.number(), v.description('Y position in the parent')))),
    ...iconOptionInputs
  }),
  execute: async (figma, args) => {
    const names = args.names ?? (args.name ? [args.name] : [])
    if (names.length === 0) return { error: 'Provide "names" (array) or "name" (string)' }

    const size = args.size ?? 24
    const parsedColor = parseToolColor(args.color ?? '#000000', figma.graph.documentColorSpace)
    if ('error' in parsedColor) return parsedColor
    const options = iconOptions(args)

    let icons
    try {
      icons = await figma.icons.icons(names, size, options)
    } catch (e) {
      return { error: (e as Error).message }
    }

    const inserted: { id: string; name: string; icon: string }[] = []
    const notFound: string[] = []

    const parentId = args.parent_id ?? figma.currentPage.id
    prepareSlotInsertion(figma.graph, parentId, 'insert_icon')
    for (const name of names) {
      const icon = icons.get(name)
      if (!icon || icon.paths.length === 0) {
        notFound.push(name)
        continue
      }
      // A position puts the icon there; without one, its parent's layout places it.
      const overrides =
        args.x === undefined && args.y === undefined ? {} : { x: args.x ?? 0, y: args.y ?? 0 }
      const frame = placeIcon(figma.graph, parentId, icon, {
        size,
        color: parsedColor,
        overrides
      })
      inserted.push({ id: frame.id, name: frame.name, icon: name })
    }

    if (args.name && inserted.length === 1) {
      return { id: inserted[0].id, name: inserted[0].name, type: 'FRAME' as const }
    }

    const result: Record<string, unknown> = { inserted }
    if (notFound.length > 0) result.not_found = notFound
    return result
  }
})

export const searchIconsTool = defineTool({
  name: 'search_icons',
  exposure: { webmcp: false },
  description:
    'Search Iconify for icons by keyword. Accepts multiple queries — all searched in parallel. Returns results keyed by query.',
  execution: { kind: 'async', mutation: 'none' },
  capabilities: ['network:access'],
  input: v.strictObject({
    queries: v.pipe(
      v.array(v.string()),
      v.minLength(1),
      v.description('Search keywords (e.g. ["heart", "arrow", "settings"])')
    ),
    limit: v.optional(
      toolNumber(v.pipe(v.number(), v.description('Max results per query (default: 5)')))
    ),
    prefix: v.optional(
      v.pipe(v.string(), v.description('Filter by icon set prefix (e.g. "lucide", "mdi")'))
    )
  }),
  execute: async (figma, args) => {
    try {
      const options = { limit: args.limit ?? 5, prefix: args.prefix }
      const results = await Promise.all(
        args.queries.map(
          async (query) => [query, await figma.icons.search(query, options)] as const
        )
      )
      return Object.fromEntries(
        results.map(([query, result]) => [query, { icons: result.icons, total: result.total }])
      )
    } catch (e) {
      return { error: (e as Error).message }
    }
  }
})
