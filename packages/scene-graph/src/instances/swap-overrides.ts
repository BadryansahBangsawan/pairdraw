import type { SceneGraph } from '../graph'
import type { SceneNode } from '../types'
import { INSTANCE_OVERRIDE_FIELDS } from './fields'
import {
  isLayerReferenceOverride,
  overriddenBindingField,
  overriddenVariableModeCollection,
  ownInstanceOverrides,
  setInstanceOverride
} from './overrides'
import { copyProp } from './sync'

/** What a swap keeps for one layer, so the layer that replaces it can take the values over. */
interface CapturedLayer {
  snapshot: SceneNode
  fields: string[]
}

/** Overrides kept across a swap, keyed by each layer's name path inside the instance. */
export type CapturedInstanceOverrides = Map<string, CapturedLayer>

const OVERRIDE_FIELD_KEYS = new Set<string>(INSTANCE_OVERRIDE_FIELDS)

function isInstanceOverrideField(field: string): field is keyof SceneNode {
  return OVERRIDE_FIELD_KEYS.has(field)
}

/**
 * A layer's place inside its instance: the names from the instance down, with the position among
 * siblings of the same name appended, so two layers called the same stay apart.
 */
function childPath(parentPath: string, name: string, index: number): string {
  return `${parentPath}/${name}#${index}`
}

function forEachChildPath(
  graph: SceneGraph,
  parentId: string,
  parentPath: string,
  visit: (child: SceneNode, path: string) => void
): void {
  const seen = new Map<string, number>()
  for (const child of graph.getChildren(parentId)) {
    const index = seen.get(child.name) ?? 0
    seen.set(child.name, index + 1)
    const path = childPath(parentPath, child.name, index)
    visit(child, path)
    forEachChildPath(graph, child.id, path, visit)
  }
}

/**
 * Every override an instance's layers record, keyed by path, so a swap of the component can give
 * them back to the layers of the variant that replace them, as Figma keeps overrides where the
 * two variants share a layer.
 */
export function captureInstanceOverrides(
  graph: SceneGraph,
  instance: SceneNode
): CapturedInstanceOverrides {
  const captured: CapturedInstanceOverrides = new Map()
  forEachChildPath(graph, instance.id, '', (child, path) => {
    const fields = instance.instanceOverrides.descendants.get(child.id)
    if (!fields?.size) return
    const kept = [...fields.keys()].filter(
      (field) => isInstanceOverrideField(field) || !isLayerReferenceOverride(field)
    )
    if (kept.length) captured.set(path, { snapshot: structuredClone(child), fields: kept })
  })
  return captured
}

function changesFor(layer: CapturedLayer): Partial<SceneNode> {
  const changes: Partial<SceneNode> = {}
  const bindings: Record<string, string> = {}
  const modes: Record<string, string> = {}
  let bindingsTouched = false
  let modesTouched = false
  for (const field of layer.fields) {
    const binding = overriddenBindingField(field)
    if (binding) {
      bindingsTouched = true
      if (binding in layer.snapshot.boundVariables)
        bindings[binding] = layer.snapshot.boundVariables[binding]
      continue
    }
    const collection = overriddenVariableModeCollection(field)
    if (collection) {
      modesTouched = true
      if (collection in layer.snapshot.variableModes)
        modes[collection] = layer.snapshot.variableModes[collection]
      continue
    }
    if (isInstanceOverrideField(field)) copyProp(changes, layer.snapshot, field)
  }
  if (bindingsTouched) changes.boundVariables = bindings
  if (modesTouched) changes.variableModes = modes
  return changes
}

/**
 * Gives the captured overrides back to the layers of the instance's new component, matching each
 * layer by path, and records them again for the layers that take the old ones' places.
 */
export function restoreInstanceOverrides(
  graph: SceneGraph,
  instance: SceneNode,
  captured: CapturedInstanceOverrides
): void {
  if (!captured.size) return
  const paths: Array<{ child: SceneNode; layer: CapturedLayer }> = []
  forEachChildPath(graph, instance.id, '', (child, path) => {
    const layer = captured.get(path)
    if (layer) paths.push({ child, layer })
  })
  if (!paths.length) return
  for (const { child, layer } of paths) {
    const changes = changesFor(layer)
    if (Object.keys(changes).length) graph.updateNode(child.id, changes)
    for (const field of layer.fields)
      setInstanceOverride(ownInstanceOverrides(instance), instance.id, child.id, field)
  }
  graph.updateNode(instance.id, { instanceOverrides: ownInstanceOverrides(instance) })
}
