import { tryParseColor, colorToHex } from '../color'
import type { SceneGraph } from '../graph'
import { readPluginData, withPluginData } from '../plugin-data/field'
import { PAIRDRAW_PLUGIN_DATA } from '../plugin-data/fields'
import { randomHex } from '../random'
import type { PluginDataEntry } from '../types'
import {
  DESIGN_MEMORY_LIMITS,
  type DesignDecisionAuthor,
  type DesignMemory,
  type DesignMemoryGroup
} from './schema'

const { designMemory } = PAIRDRAW_PLUGIN_DATA

const GROUP_LIMITS = {
  colors: DESIGN_MEMORY_LIMITS.colors,
  fonts: DESIGN_MEMORY_LIMITS.fonts,
  fontSizes: DESIGN_MEMORY_LIMITS.numbers,
  spacing: DESIGN_MEMORY_LIMITS.numbers,
  radius: DESIGN_MEMORY_LIMITS.numbers
} as const satisfies Record<DesignMemoryGroup, number>

/**
 * A new memory: every group allows the document's own variables and styles. Off-system colors
 * and fonts refuse an agent's edit; sizes, spacing and radii have real exceptions, so they warn.
 */
export function createDesignMemory(): DesignMemory {
  return {
    version: 1,
    colors: { fromSystem: true, values: [], enforce: 'refuse' },
    fonts: { fromSystem: true, values: [], enforce: 'refuse' },
    fontSizes: { fromSystem: true, values: [], enforce: 'warn' },
    spacing: { fromSystem: true, values: [], enforce: 'warn' },
    radius: { fromSystem: true, values: [], enforce: 'warn' },
    decisions: [],
    examples: []
  }
}

/** The document's memory, or null when it has none or it is unreadable. */
export function readDesignMemory(graph: SceneGraph): DesignMemory | null {
  return readPluginData(graph.getNode(graph.rootId)?.pluginData, designMemory) ?? null
}

const MEMORIES = new WeakMap<
  SceneGraph,
  { entries: readonly PluginDataEntry[] | undefined; memory: DesignMemory | null }
>()

/**
 * The document's memory, read once per state of its document node: an edit replaces the node's
 * plugin data, so a check on every agent call parses nothing new.
 */
export function cachedDesignMemory(graph: SceneGraph): DesignMemory | null {
  const entries = graph.getNode(graph.rootId)?.pluginData
  const known = MEMORIES.get(graph)
  if (known && known.entries === entries) return known.memory
  const memory = readDesignMemory(graph)
  MEMORIES.set(graph, { entries, memory })
  return memory
}

/** Stores the memory on the document node as an undoable change; `null` removes it. */
export function writeDesignMemory(graph: SceneGraph, memory: DesignMemory | null): void {
  const root = graph.getNode(graph.rootId)
  if (!root) return
  graph.updateNode(root.id, {
    pluginData: withPluginData(root.pluginData, designMemory, memory ?? undefined)
  })
}

/** A value as a group keeps it, or null when it is not one: colors become `#RRGGBB`. */
export function normalizeDesignValue(
  group: DesignMemoryGroup,
  value: string | number
): string | number | null {
  if (group === 'colors') {
    const color = typeof value === 'string' ? tryParseColor(value.trim()) : null
    return color ? colorToHex(color) : null
  }
  if (group === 'fonts') {
    const family = typeof value === 'string' ? value.trim() : ''
    return family && family.length <= DESIGN_MEMORY_LIMITS.fontLength ? family : null
  }
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return null
  // A text has a size; spacing and radii may be zero.
  return number > 0 || (number === 0 && group !== 'fontSizes') ? number : null
}

/**
 * The memory with `value` allowed in `group`, once; a value the group cannot read, or one past
 * its limit, leaves it as it was.
 */
export function allowDesignValue(
  memory: DesignMemory,
  group: DesignMemoryGroup,
  value: string | number
): DesignMemory {
  const normalized = normalizeDesignValue(group, value)
  const values: readonly (string | number)[] = memory[group].values
  if (normalized === null || values.includes(normalized) || values.length >= GROUP_LIMITS[group])
    return memory
  return { ...memory, [group]: { ...memory[group], values: [...values, normalized] } }
}

/** The memory with `value` no longer allowed in `group` by itself. */
export function disallowDesignValue(
  memory: DesignMemory,
  group: DesignMemoryGroup,
  value: string | number
): DesignMemory {
  const values: readonly (string | number)[] = memory[group].values
  return {
    ...memory,
    [group]: { ...memory[group], values: values.filter((item) => item !== value) }
  }
}

/** The memory with a decision added last; blank text or a full list leaves it as it was. */
export function addDesignDecision(
  memory: DesignMemory,
  text: string,
  author: DesignDecisionAuthor
): DesignMemory {
  const trimmed = text.trim().slice(0, DESIGN_MEMORY_LIMITS.decisionLength).trim()
  if (!trimmed || memory.decisions.length >= DESIGN_MEMORY_LIMITS.decisions) return memory
  return {
    ...memory,
    decisions: [...memory.decisions, { id: randomHex(8), text: trimmed, author }]
  }
}

/** The memory with a layer pinned as an example, once; a full list leaves it as it was. */
export function pinDesignExample(memory: DesignMemory, nodeId: string): DesignMemory {
  if (
    memory.examples.some((example) => example.nodeId === nodeId) ||
    memory.examples.length >= DESIGN_MEMORY_LIMITS.examples
  )
    return memory
  return { ...memory, examples: [...memory.examples, { nodeId }] }
}
