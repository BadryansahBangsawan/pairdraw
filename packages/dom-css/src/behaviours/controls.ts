import type { ComponentPropertyDefinition, SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import {
  behaviourContract,
  behaviourOwner,
  behaviourProperties,
  booleanBinding,
  hasBehaviour,
  layerPath,
  partBinding,
  readBehaviour,
  textBinding,
  type Behaviour
} from '@pairdraw/scene-graph/behaviours'
import { findComponentPropertyTargets } from '@pairdraw/scene-graph/components'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'
import { slotPropertyId } from '@pairdraw/scene-graph/slots'

/** A boolean value of a control and the property that draws it. */
export interface BooleanModel {
  definition: ComponentPropertyDefinition
  on?: string
  off?: string
  /** The value as the document's instance draws it. */
  designed: boolean
}

/** The variant property a tabs' choice binds, its options, and the one the instance shows. */
export interface ChoiceControlModel {
  definition: ComponentPropertyDefinition
  options: string[]
  /** The option's index as the document's instance draws it, 0 when none does. */
  designed: number
}

/** The variant property that draws a control's interaction states. */
export interface StatesModel {
  name: string
  values: NonNullable<Behaviour['states']>
  /** The value the instance shows at rest. */
  rest: string | undefined
  /** Whether the document's instance is drawn disabled. */
  designedDisabled: boolean
}

/** An instance with a behaviour below a root layer: its values, states, and bound layers. */
export interface ControlModel {
  /** The instance's layer path below the root. */
  path: string
  kind: Behaviour['kind']
  behaviour: Behaviour
  booleans: Record<string, BooleanModel>
  /** For tabs bound to a variant property, the tabs the triggers choose among. */
  choice: ChoiceControlModel | null
  states: StatesModel | null
  /** Each bound part's slot frame, by part id, as a layer path below the root. */
  parts: Record<string, string>
  /** Each bound text value's text layer, by value id, as a layer path below the root. */
  texts: Record<string, { path: string; designed: string }>
  /** The children of the items slot that are controls themselves, in order. */
  items: ControlModel[]
  /**
   * Layers the control decides to show, which the design may hide: tab panels, or a
   * collapsible's content, as layer paths below the root.
   */
  reveal: string[]
  /** For tabs, each panel's layer path, in order. */
  panels: string[]
  /** For tabs, each trigger's layer path, in order. */
  triggers: string[]
}

function designedBoolean(
  graph: SceneGraph,
  instance: SceneNode,
  definition: ComponentPropertyDefinition,
  on: string | undefined
): boolean {
  if (definition.type === 'BOOLEAN') {
    const assignments = instance.componentPropertyAssignments
    const value = Object.hasOwn(assignments, definition.id)
      ? assignments[definition.id]
      : definition.defaultValue
    return value === 'true'
  }
  return instanceMainComponent(graph, instance)?.componentPropertyValues[definition.name] === on
}

function statesModel(
  graph: SceneGraph,
  instance: SceneNode,
  owner: SceneNode,
  behaviour: Behaviour
): StatesModel | null {
  const states = behaviour.states
  const definition = states
    ? behaviourProperties(graph, owner).find(
        (item) => item.id === states.propertyId && item.type === 'VARIANT'
      )
    : undefined
  if (!states || !definition) return null
  const authored = instanceMainComponent(graph, instance)?.componentPropertyValues[definition.name]
  return {
    name: definition.name,
    values: states,
    rest: states.rest ?? authored,
    designedDisabled: !!states.disabled && authored === states.disabled
  }
}

/**
 * The frames an instance binds to slot properties, which its parts are. A slot may sit inside
 * another, as a slider's range in its track: Figma keeps both in the component and makes the
 * inner one part of the outer one's content in an instance, so the search goes through slots
 * but not into nested instances, which are controls of their own.
 */
function partFrames(graph: SceneGraph, instance: SceneNode): SceneNode[] {
  const frames: SceneNode[] = []
  const visit = (node: SceneNode): void => {
    for (const child of graph.getChildren(node.id)) {
      if (slotPropertyId(child)) frames.push(child)
      if (child.type !== 'INSTANCE') visit(child)
    }
  }
  visit(instance)
  return frames
}

function controlModel(graph: SceneGraph, rootId: string, instance: SceneNode): ControlModel | null {
  const component = instanceMainComponent(graph, instance)
  const owner = component && behaviourOwner(graph, component)
  const behaviour = owner && readBehaviour(owner)
  if (!owner || !behaviour) return null
  const path = layerPath(graph, rootId, instance.id)
  const properties = behaviourProperties(graph, owner)
  const booleans: Record<string, BooleanModel> = {}
  for (const valueId of Object.keys(behaviour.booleans)) {
    const binding = booleanBinding(behaviour, valueId)
    const definition = properties.find((item) => item.id === binding?.propertyId)
    if (!binding || !definition) continue
    booleans[valueId] = {
      definition,
      on: binding.on,
      off: binding.off,
      designed: designedBoolean(graph, instance, definition, binding.on)
    }
  }
  const choice = choiceModel(behaviour, properties, component)

  const frames = partFrames(graph, instance)
  const parts = Object.fromEntries(
    Object.entries(behaviour.parts).flatMap(([partId, propertyId]) => {
      const frame = frames.find((item) => slotPropertyId(item) === propertyId)
      return frame ? [[partId, layerPath(graph, rootId, frame.id)]] : []
    })
  )
  const texts = Object.fromEntries(
    Object.keys(behaviour.texts).flatMap((valueId) => {
      const propertyId = textBinding(behaviour, valueId)
      const target = propertyId
        ? findComponentPropertyTargets(graph, instance, propertyId).find(
            (item) => item.node.type === 'TEXT'
          )
        : undefined
      return target
        ? [
            [
              valueId,
              { path: layerPath(graph, rootId, target.node.id), designed: target.node.text }
            ]
          ]
        : []
    })
  )
  const frameOf = (partId: string) => {
    const propertyId = partBinding(behaviour, partId)
    return propertyId ? frames.find((item) => slotPropertyId(item) === propertyId) : undefined
  }
  const itemsPart = behaviourContract(behaviour.kind).parts.find((part) => part.items)
  const itemsFrame = itemsPart ? frameOf(itemsPart.id) : undefined
  const items = (itemsFrame ? graph.getChildren(itemsFrame.id) : []).flatMap((child) => {
    const item = controlModel(graph, rootId, child)
    return item ? [item] : []
  })
  const childPaths = (frame: SceneNode | undefined) =>
    (frame ? graph.getChildren(frame.id) : []).map((child) => layerPath(graph, rootId, child.id))
  const panels = behaviour.kind === 'tabs' ? childPaths(frameOf('panels')) : []
  const content = behaviour.kind === 'collapsible' ? frameOf('content') : undefined
  return {
    path,
    kind: behaviour.kind,
    behaviour,
    booleans,
    choice,
    states: statesModel(graph, instance, owner, behaviour),
    parts,
    texts,
    items,
    reveal: content ? [layerPath(graph, rootId, content.id)] : panels,
    panels,
    triggers: behaviour.kind === 'tabs' ? childPaths(frameOf('list')) : []
  }
}

/** The variant property a tabs' choice binds, its options, and the drawn option's index. */
function choiceModel(
  behaviour: Behaviour,
  properties: readonly ComponentPropertyDefinition[],
  component: SceneNode | undefined
): ChoiceControlModel | null {
  const binding = behaviour.kind === 'tabs' ? booleanBinding(behaviour, 'value') : undefined
  const definition = properties.find(
    (item) => item.id === binding?.propertyId && item.type === 'VARIANT'
  )
  const options = definition?.variantOptions ?? []
  if (!definition || options.length === 0) return null
  const designed = component?.componentPropertyValues[definition.name]
  return { definition, options, designed: Math.max(0, options.indexOf(designed ?? '')) }
}

/**
 * The controls below a root layer, by layer path, outermost first. Items of a group are listed
 * both in the group's `items` and on their own, since each keeps its own state. Preview runs
 * them as live islands; export generates components from them.
 */
export function behaviourControls(graph: SceneGraph, rootId: string): Map<string, ControlModel> {
  const controls = new Map<string, ControlModel>()
  const visit = (node: SceneNode) => {
    if (hasBehaviour(graph, node)) {
      const control = controlModel(graph, rootId, node)
      if (control) controls.set(control.path, control)
    }
    for (const child of graph.getChildren(node.id)) visit(child)
  }
  const root = graph.getNode(rootId)
  if (root) visit(root)
  return controls
}

/** A control's boolean value, if the behaviour binds it. */
export function booleanOf(control: ControlModel, valueId: string): BooleanModel | undefined {
  return Object.hasOwn(control.booleans, valueId) ? control.booleans[valueId] : undefined
}
