import type { SceneNode } from '@pairdraw/scene-graph'
import { createComponentPropertyId } from '@pairdraw/scene-graph/components'
import {
  canCreateSlot,
  claimSlotContent,
  createSlotProperty,
  slotOwner,
  slotScope,
  updateSlotProperty
} from '@pairdraw/scene-graph/slots'

import type { Build } from './nodes'
import type { PenNode } from './schema'

/**
 * Makes a frame pen.dev marks with `slot` a slot of the component it is in, suggesting the
 * components it lists that the document defines. A frame outside a component has no slot to be.
 */
export function createPenSlot(node: SceneNode, pen: PenNode, build: Build): void {
  const { graph, components } = build
  if (!Array.isArray(pen.slot) || !canCreateSlot(graph, node)) return
  const definition = createSlotProperty(graph, node.id, createComponentPropertyId())
  const owner = slotOwner(graph, node)
  if (!definition || !owner) return
  const preferredValues = pen.slot.filter((id) => components.get(id)?.type === 'frame')
  if (preferredValues.length > 0)
    updateSlotProperty(graph, owner.id, definition.id, { preferredValues })
}

/**
 * Lets `instance` own the content of the slot frame `target`, which an override of its is about
 * to fill, as filling a slot in pen.dev keeps the instance. Returns false when `target` is not a
 * slot of that very instance, whose layers the override must then replace.
 */
export function claimSlot(build: Build, instance: SceneNode, target: SceneNode): boolean {
  const scope = slotScope(build.graph, target.id)
  if (scope.kind !== 'slot' || scope.frame.id !== target.id || scope.instance.id !== instance.id)
    return false
  claimSlotContent(build.graph, scope)
  return true
}
