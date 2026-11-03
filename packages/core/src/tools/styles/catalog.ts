import { EDITORIAL_ARCHETYPES } from './archetypes/editorial'
import { EXPRESSIVE_ARCHETYPES } from './archetypes/expressive'
import { PRODUCT_ARCHETYPES } from './archetypes/product'
import { STYLE_GUIDES } from './guides'
import type { StyleArchetype, StyleArchetypeId } from './types'

/** Every curated direction, in catalog order: editorial, then product, then expressive. */
export const STYLE_ARCHETYPES: readonly StyleArchetype[] = [
  ...EDITORIAL_ARCHETYPES,
  ...PRODUCT_ARCHETYPES,
  ...EXPRESSIVE_ARCHETYPES
]

const byId = new Map(STYLE_ARCHETYPES.map((archetype) => [archetype.id, archetype]))

/** A direction with its written guidance, as `get_style` serves one. */
export interface StyleArchetypeWithGuide extends StyleArchetype {
  guide: string
}

export function getStyleArchetype(id: StyleArchetypeId): StyleArchetypeWithGuide | null {
  const archetype = byId.get(id)
  return archetype ? { ...archetype, guide: STYLE_GUIDES[id].trim() } : null
}

/** Words of a request, lower-cased, without punctuation or words too short to mean much. */
function queryWords(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 2)
}

/** How well a direction matches the words: names and tags weigh most, then uses, then the summary. */
function matchScore(archetype: StyleArchetype, words: readonly string[]): number {
  const fields: [text: string, weight: number][] = [
    [archetype.name.toLowerCase(), 3],
    [archetype.tags.join(' ').toLowerCase(), 3],
    [archetype.bestFor.join(' ').toLowerCase(), 2],
    [archetype.summary.toLowerCase(), 1]
  ]
  let score = 0
  for (const word of words) {
    for (const [text, weight] of fields) if (text.includes(word)) score += weight
  }
  return score
}

export interface StyleSearch {
  query?: string
  appearance?: StyleArchetype['appearance']
}

/**
 * The directions that fit a search, best first. Without a query, or when no direction shares a
 * word with it, every direction of the appearance is listed in catalog order, and `matched` is
 * false so the caller knows to pick by reading the summaries.
 */
export function searchStyleArchetypes(search: StyleSearch = {}): {
  matched: boolean
  archetypes: StyleArchetype[]
} {
  const pool = search.appearance
    ? STYLE_ARCHETYPES.filter((archetype) => archetype.appearance === search.appearance)
    : [...STYLE_ARCHETYPES]
  const words = search.query ? queryWords(search.query) : []
  if (words.length === 0) return { matched: false, archetypes: pool }
  const scored = pool
    .map((archetype, index) => ({ archetype, index, score: matchScore(archetype, words) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
  if (scored.length === 0) return { matched: false, archetypes: pool }
  return { matched: true, archetypes: scored.map((entry) => entry.archetype) }
}
