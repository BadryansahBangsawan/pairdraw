import type { SceneGraph } from '@pairdraw/scene-graph'
import {
  cachedDesignMemory,
  type DesignDecisionAuthor,
  type DesignMemoryEnforcement,
  type DesignMemoryGroup
} from '@pairdraw/scene-graph/design-memory'

import { currentDesignRules } from './document'

/** How many allowed values of a group a report lists by default. */
const LISTED_VALUES = 64

export interface DesignGroupReport {
  enforce: DesignMemoryEnforcement
  /** Whether the document's variables and styles count. */
  fromSystem: boolean
  allowed: { value: string | number; name: string | null }[]
  /** Allowed values past the listed ones. */
  more: number
}

export interface DesignExampleReport {
  id: string
  /** Null for a layer the document no longer has. */
  name: string | null
  page: string | null
  width: number | null
  height: number | null
}

/** A document's design memory as agents, the CLI and the chat read it. */
export interface DesignMemoryReport {
  groups: Record<DesignMemoryGroup, DesignGroupReport>
  decisions: { id: string; text: string; author: DesignDecisionAuthor }[]
  examples: DesignExampleReport[]
}

/** The document's memory with its allowed values resolved; null when it has none. */
export function describeDesignMemory(
  graph: SceneGraph,
  limit = LISTED_VALUES
): DesignMemoryReport | null {
  const memory = cachedDesignMemory(graph)
  if (!memory) return null
  const rules = currentDesignRules(graph, memory)
  const group = (name: DesignMemoryGroup): DesignGroupReport => {
    const { enforce, fromSystem, allowed } = rules[name]
    return {
      enforce,
      fromSystem,
      allowed: allowed.slice(0, limit).map(({ value, name: source }) => ({ value, name: source })),
      more: Math.max(0, allowed.length - limit)
    }
  }
  return {
    groups: {
      colors: group('colors'),
      fonts: group('fonts'),
      fontSizes: group('fontSizes'),
      spacing: group('spacing'),
      radius: group('radius')
    },
    decisions: memory.decisions.map(({ id, text, author }) => ({ id, text, author })),
    examples: memory.examples.map(({ nodeId }) => {
      const node = graph.getNode(nodeId)
      const page = node ? graph.getNode(graph.pageOf(node.id) ?? '') : undefined
      return {
        id: nodeId,
        name: node?.name ?? null,
        page: page?.name ?? null,
        width: node?.width ?? null,
        height: node?.height ?? null
      }
    })
  }
}
