import * as v from 'valibot'

import { defineTool } from '#core/tools/schema'

import applyStyle from './apply.md?raw'
import { getStyleArchetype, searchStyleArchetypes } from './catalog'
import { STYLE_ARCHETYPE_IDS } from './types'

export const getStyle = defineTool({
  name: 'get_style',
  description:
    'Curated visual directions (style archetypes) to design in: palette by role, font pairing, type scale, radii, spacing, borders, elevation, and written guidance on layout, imagery, components, and what to avoid. Call it before designing something new without an existing look, or when the user asks for a style, mood, or restyle. Without an id it lists the directions, best match first when a query describes the request (e.g. "calm health app", "dark crypto dashboard"); with an id it returns that direction in full with how to apply it.',
  execution: { kind: 'sync', mutation: 'none' },
  input: v.strictObject({
    id: v.optional(
      v.pipe(v.picklist(STYLE_ARCHETYPE_IDS), v.description('Direction to return in full'))
    ),
    query: v.optional(
      v.pipe(
        v.string(),
        v.description('Words describing the product, audience, or mood, to rank the list by')
      )
    ),
    appearance: v.optional(
      v.pipe(
        v.picklist(['light', 'dark']),
        v.description('List only light or only dark directions')
      )
    )
  }),
  execute: (_figma, { id, query, appearance }) => {
    if (id) {
      const style = getStyleArchetype(id)
      if (!style) return { error: `No style "${id}"` }
      return { style, apply: applyStyle.trim() }
    }
    const { matched, archetypes } = searchStyleArchetypes({ query, appearance })
    return {
      matched,
      styles: archetypes.map(({ id, name, summary, appearance, bestFor, tags }) => ({
        id,
        name,
        summary,
        appearance,
        best_for: bestFor,
        tags
      })),
      next: 'Call get_style with one id for its palette, fonts, tokens, and guide.'
    }
  }
})
