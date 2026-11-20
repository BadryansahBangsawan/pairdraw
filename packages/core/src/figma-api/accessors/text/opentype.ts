import type { SceneNode } from '@pairdraw/scene-graph'

import { characterStyles } from '#core/text/character-style'

import { invalid, received } from './messages'

/**
 * The style patch `setRangeOpenTypeFeatures` gives a range: the features its characters already
 * had, with the given tags replacing their own entries, as setRangeFontName keeps the axes it
 * does not name. A non-boolean value is refused before anything changes.
 */
export function openTypeFeaturesPatch(
  method: string,
  node: SceneNode,
  start: number,
  value: unknown
): { fontFeatures: Array<{ tag: string; enabled: boolean }> } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw invalid(method, `Expected object, received ${received(value)}`)
  }
  const features: Record<string, boolean> = {}
  for (const [tag, enabled] of Object.entries(value)) {
    if (typeof enabled !== 'boolean') {
      throw invalid(method, `Expected boolean at .${tag}, received ${received(enabled)}`)
    }
    features[tag.toUpperCase()] = enabled
  }
  const [first] = characterStyles(node, start, start + 1)
  const merged = new Map(first.fontFeatures.map((feature) => [feature.tag, feature.enabled]))
  for (const [tag, enabled] of Object.entries(features)) merged.set(tag, enabled)
  return { fontFeatures: [...merged].map(([tag, enabled]) => ({ tag, enabled })) }
}