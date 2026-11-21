import type { SceneGraph } from '@pairdraw/scene-graph'
import {
  DESIGN_MEMORY_GROUPS,
  type DesignMemory,
  type DesignMemoryGroup
} from '@pairdraw/scene-graph/design-memory'

import { designValues } from './values'

/** A value the layers use, how often, and whether a variable or style already gives it. */
export interface DistilledValue {
  value: string | number
  count: number
  /** Given by a variable or a style, so the document's system already allows it. */
  fromSystem: boolean
}

export type DistilledValues = Record<DesignMemoryGroup, DistilledValue[]>

/** How many layers one distil reads, so learning from a whole document stays quick. */
const MAX_LAYERS = 20_000

/**
 * The values the layers under `rootIds` use, most used first, as rules to learn: colors,
 * fonts, font sizes, spacing and radii, each once. Instances count as the component they show,
 * so a component placed fifty times is not fifty votes.
 */
export function distilDesignValues(graph: SceneGraph, rootIds: readonly string[]): DistilledValues {
  const tallies = new Map<string, DistilledValue & { group: DesignMemoryGroup }>()
  const pending = [...rootIds]
  let visited = 0
  while (pending.length > 0 && visited < MAX_LAYERS) {
    const id = pending.pop()
    const node = id === undefined ? undefined : graph.getNode(id)
    if (!node || !node.visible) continue
    visited++
    for (const value of designValues(node)) {
      const key = `${value.group}:${typeof value.value === 'string' ? value.value.toLowerCase() : value.value}`
      const tally = tallies.get(key)
      if (tally) {
        tally.count++
        tally.fromSystem ||= value.fromSystem
      } else {
        tallies.set(key, {
          group: value.group,
          value: value.value,
          count: 1,
          fromSystem: value.fromSystem
        })
      }
    }
    if (node.type !== 'INSTANCE') pending.push(...node.childIds)
  }
  const result: DistilledValues = { colors: [], fonts: [], fontSizes: [], spacing: [], radius: [] }
  for (const { group, ...value } of tallies.values()) result[group].push(value)
  for (const group of DESIGN_MEMORY_GROUPS) result[group].sort((a, b) => b.count - a.count)
  return result
}

/** Whether a distilled value is worth proposing: used more than once, and not already allowed. */
export function proposesValue(
  memory: DesignMemory | null,
  group: DesignMemoryGroup,
  value: DistilledValue
): boolean {
  if (value.count < 2) return false
  const values: readonly (string | number)[] = memory?.[group].values ?? []
  return !values.includes(value.value)
}
