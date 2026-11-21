import type { SceneGraph } from '@pairdraw/scene-graph'
import {
  addDesignDecision,
  cachedDesignMemory,
  pinDesignExample,
  writeDesignMemory,
  type DesignMemory,
  type DesignMemoryGroup
} from '@pairdraw/scene-graph/design-memory'

import { checkDesignValues, currentDesignRules, type DesignValueVerdict } from '#core/design-memory'

import { nodeOf, type NodeRef } from './behaviours'

const NO_MEMORY =
  'This document has no design memory; the person creates one in the Design panel with nothing selected.'

function memoryOf(graph: SceneGraph): DesignMemory {
  const memory = cachedDesignMemory(graph)
  if (!memory) throw new Error(NO_MEMORY)
  return memory
}

/** Judges values before they are used: `ok`, `warn`, `refuse`, or `invalid`, with the nearest allowed. */
export function checkProposedDesignValues(
  graph: SceneGraph,
  proposal: Partial<Record<DesignMemoryGroup, readonly (string | number)[]>>
): DesignValueVerdict[] {
  return checkDesignValues(currentDesignRules(graph, memoryOf(graph)), proposal)
}

/**
 * Writes down a decision an agent made, and pins `example` as a layer that shows it. Agents add
 * to the memory but never change what it allows: only the person does that.
 */
export function recordDesignDecision(
  graph: SceneGraph,
  text: string,
  example?: NodeRef
): { decisions: number; examples: number } {
  let memory = memoryOf(graph)
  const decisions = memory.decisions.length
  memory = addDesignDecision(memory, text, 'agent')
  if (memory.decisions.length === decisions) {
    throw new Error(
      text.trim()
        ? 'The design memory holds as many decisions as it can; ask the person to remove some.'
        : 'A decision needs text.'
    )
  }
  if (example !== undefined) {
    const nodeId = nodeOf(graph, example).id
    memory = pinDesignExample(memory, nodeId)
    if (!memory.examples.some((pinned) => pinned.nodeId === nodeId))
      throw new Error(
        'The design memory holds as many examples as it can; ask the person to unpin some.'
      )
  }
  writeDesignMemory(graph, memory)
  return { decisions: memory.decisions.length, examples: memory.examples.length }
}
