import { omitBy } from 'es-toolkit/object'

import type { SceneGraph } from '../graph'
import { slotPropertyId } from '../slots/frames'
import type { ComponentPropertyDefinition, SceneNode } from '../types'
import { behaviourContract } from './kinds'
import {
  behaviourProperties,
  booleanBinding,
  emptyBehaviour,
  guessInteractionStates,
  textBinding
} from './model'
import { isNumberRange, type Behaviour, type BehaviourSpec } from './schema'

/** Variant values that usually mean on, compared case-insensitively. */
const ON_NAMES = ['on', 'true', 'yes', 'checked', 'pressed', 'open', 'selected', 'active']
const OFF_NAMES = ['off', 'false', 'no', 'unchecked', 'closed', 'default', 'inactive']

function named(names: readonly string[], options: readonly string[]): string | undefined {
  return options.find((option) => names.includes(option.trim().toLowerCase()))
}

/**
 * The variant values that likely mean on and off: names such as On, True, or Checked first,
 * then the values in order.
 */
export function guessOnOff(
  options: readonly string[],
  explicit: { on?: string; off?: string } = {}
): { on?: string; off?: string } {
  const on = explicit.on ?? named(ON_NAMES, options) ?? options[0]
  const off = explicit.off ?? named(OFF_NAMES, options) ?? options.find((option) => option !== on)
  return { on, off }
}

function findProperty(
  properties: readonly ComponentPropertyDefinition[],
  name: string,
  types: readonly ComponentPropertyDefinition['type'][],
  what: string
): ComponentPropertyDefinition {
  const found = properties.find((item) => item.name === name && types.includes(item.type))
  if (found) return found
  const available = properties.filter((item) => types.includes(item.type)).map((item) => item.name)
  throw new Error(
    `${what} needs a ${types.join(' or ')} property named "${name}"; the component has ${
      available.length ? available.map((item) => `"${item}"`).join(', ') : 'none'
    }`
  )
}

type ValueBinding = NonNullable<BehaviourSpec['values']>[string]
type StatesSpec = NonNullable<BehaviourSpec['states']>

function listed(items: readonly { id: string }[]): string {
  return items.map((item) => `"${item.id}"`).join(', ')
}

/** Bind a boolean or text value to the property named in its binding. */
function resolveValue(
  behaviour: Behaviour,
  properties: readonly ComponentPropertyDefinition[],
  valueId: string,
  binding: ValueBinding
): void {
  const contract = behaviourContract(behaviour.kind)
  const value = contract.values.find((item) => item.id === valueId)
  if (!value)
    throw new Error(
      `A ${behaviour.kind} has no value "${valueId}"; it has ${listed(contract.values)}`
    )
  const name = typeof binding === 'string' ? binding : binding.property
  if (value.type === 'choice') {
    // A choice is which child of its slot is active, held by the variant property that draws it.
    const definition = findProperty(properties, name, ['VARIANT'], valueId)
    behaviour.booleans[valueId] = { propertyId: definition.id }
    return
  }
  if (value.type === 'text') {
    behaviour.texts[valueId] = { propertyId: findProperty(properties, name, ['TEXT'], valueId).id }
    return
  }
  const definition = findProperty(properties, name, ['VARIANT', 'BOOLEAN'], valueId)
  if (definition.type === 'BOOLEAN') {
    behaviour.booleans[valueId] = { propertyId: definition.id }
    return
  }
  const options = definition.variantOptions ?? []
  const explicit: { on?: string; off?: string } = typeof binding === 'string' ? {} : binding
  const { on, off } = guessOnOff(options, explicit)
  for (const choice of [on, off])
    if (choice !== undefined && !options.includes(choice))
      throw new Error(`"${definition.name}" has no value "${choice}"; it has ${options.join(', ')}`)
  behaviour.booleans[valueId] = { propertyId: definition.id, on, off }
}

function resolveStates(
  behaviour: Behaviour,
  properties: readonly ComponentPropertyDefinition[],
  states: StatesSpec
): void {
  const name = typeof states === 'string' ? states : states.property
  const definition = findProperty(properties, name, ['VARIANT'], 'states')
  const guessed = guessInteractionStates(definition.id, definition.variantOptions ?? [])
  if (typeof states === 'string') {
    behaviour.states = guessed
    return
  }
  const { property: _property, ...values } = states
  behaviour.states = { ...guessed, ...stripUndefined(values) }
}

/**
 * The stored behaviour for a spec, with names resolved to the owner's property and slot ids. A
 * name the component lacks, a value the kind does not have, or a variant value the property
 * does not offer fails with a message naming what exists.
 */
export function behaviourFromSpec(
  graph: SceneGraph,
  owner: SceneNode,
  spec: BehaviourSpec
): Behaviour {
  const contract = behaviourContract(spec.kind)
  const properties = behaviourProperties(graph, owner)
  const behaviour = emptyBehaviour(spec.kind)
  for (const [valueId, binding] of Object.entries(spec.values ?? {}))
    resolveValue(behaviour, properties, valueId, binding)
  const numbers = contract.values.filter((item) => item.type === 'number')
  for (const [valueId, settings] of Object.entries(spec.numbers ?? {})) {
    if (!numbers.some((item) => item.id === valueId))
      throw new Error(`A ${spec.kind} has no number value "${valueId}"; it has ${listed(numbers)}`)
    const range = { ...behaviour.numbers[valueId], ...stripUndefined(settings) }
    if (!isNumberRange(range))
      throw new Error(`"${valueId}" needs max above min and a positive step`)
    behaviour.numbers[valueId] = range
  }
  for (const [partId, slotName] of Object.entries(spec.parts ?? {})) {
    if (!contract.parts.some((item) => item.id === partId))
      throw new Error(`A ${spec.kind} has no part "${partId}"; it has ${listed(contract.parts)}`)
    const id = findProperty(properties, slotName, ['SLOT'], partId).id
    const taken = Object.entries(behaviour.parts).find(([, slot]) => slot === id)?.[0]
    if (taken) throw new Error(`"${slotName}" is already the ${taken}; a slot draws one part`)
    behaviour.parts[partId] = id
  }
  if (spec.states !== undefined) resolveStates(behaviour, properties, spec.states)
  validateChoiceValues(graph, owner, behaviour)
  return behaviour
}

/** The words a layer reads, joined across its text. */
function textOf(graph: SceneGraph, node: SceneNode): string {
  if (node.type === 'TEXT') return node.text
  return graph
    .getChildren(node.id)
    .map((child) => textOf(graph, child))
    .join(' ')
}

/** The frames in one variant bound to the tabs' list slot, without entering nested instances. */
function listFrames(graph: SceneGraph, variant: SceneNode, listPropertyId: string): SceneNode[] {
  const frames: SceneNode[] = []
  const visit = (node: SceneNode): void => {
    for (const child of graph.getChildren(node.id)) {
      if (slotPropertyId(child) === listPropertyId) frames.push(child)
      else if (child.type !== 'INSTANCE') visit(child)
    }
  }
  visit(variant)
  return frames
}

/**
 * The trigger labels under the tabs' list slot, in layer order. Each variant must draw one,
 * with the same triggers, so choosing a variant changes no more than the tab drawn.
 */
function triggerLabels(graph: SceneGraph, owner: SceneNode, listPropertyId: string): string[] {
  const variants =
    owner.type === 'COMPONENT_SET'
      ? graph.getChildren(owner.id).filter((child) => child.type === 'COMPONENT')
      : [owner]
  const frames: SceneNode[] = []
  for (const variant of variants) {
    const found = listFrames(graph, variant, listPropertyId)
    if (!found.length)
      throw new Error(`The variant "${variant.name}" has no frame bound to the tabs' list slot`)
    frames.push(...found)
  }
  const labels = frames[0]
    ? graph.getChildren(frames[0].id).map((child) => textOf(graph, child))
    : []
  for (const frame of frames.slice(1)) {
    const others = graph.getChildren(frame.id).map((child) => textOf(graph, child))
    if (others.length !== labels.length || others.some((label, index) => label !== labels[index]))
      throw new Error(
        `The tabs' triggers differ between variants; ${frames[0] ? `the first has ${labels.join(', ')}` : 'they have none'}`
      )
  }
  return labels
}

/**
 * Check the variant options a tabs' choice binds against the words its list draws. A choice
 * picks the trigger of the same value, so the property must offer exactly those values.
 */
export function validateChoiceValues(
  graph: SceneGraph,
  owner: SceneNode,
  behaviour: Behaviour
): void {
  if (behaviour.kind !== 'tabs') return
  const binding = booleanBinding(behaviour, 'value')
  const listPropertyId = behaviour.parts.list
  if (!binding || !listPropertyId) return
  const definition = behaviourProperties(graph, owner).find(
    (item) => item.id === binding.propertyId && item.type === 'VARIANT'
  )
  if (!definition) return
  const labels = triggerLabels(graph, owner, listPropertyId)
  const options = definition.variantOptions ?? []
  if (labels.length === 0) return
  if (labels.length !== options.length || labels.some((label, index) => label !== options[index]))
    throw new Error(
      `"${definition.name}" offers ${options.join(', ')}; the tabs' triggers are ${labels.join(', ')}`
    )
}

function stripUndefined<T extends Record<string, unknown>>(record: T): Partial<T> {
  return omitBy(record, (value) => value === undefined)
}

/** The spec a stored behaviour reads as, with ids back to names; unresolved bindings are left out. */
export function behaviourToSpec(
  graph: SceneGraph,
  owner: SceneNode,
  behaviour: Behaviour
): BehaviourSpec {
  const properties = behaviourProperties(graph, owner)
  const nameOf = (id: string | undefined) => properties.find((item) => item.id === id)?.name
  const values: NonNullable<BehaviourSpec['values']> = {}
  for (const [valueId, binding] of Object.entries(behaviour.booleans)) {
    const name = nameOf(binding.propertyId)
    if (name)
      values[valueId] =
        binding.on || binding.off ? { property: name, on: binding.on, off: binding.off } : name
  }
  for (const valueId of Object.keys(behaviour.texts)) {
    const name = nameOf(textBinding(behaviour, valueId))
    if (name) values[valueId] = name
  }
  const parts = Object.fromEntries(
    Object.entries(behaviour.parts).flatMap(([partId, id]) => {
      const name = nameOf(id)
      return name ? [[partId, name]] : []
    })
  )
  const statesName = nameOf(behaviour.states?.propertyId)
  const spec: BehaviourSpec = { kind: behaviour.kind }
  if (Object.keys(values).length) spec.values = values
  if (Object.keys(behaviour.numbers).length) spec.numbers = structuredClone(behaviour.numbers)
  if (Object.keys(parts).length) spec.parts = parts
  if (behaviour.states && statesName)
    spec.states = {
      ...stripUndefined({ ...behaviour.states, propertyId: undefined }),
      property: statesName
    }
  return spec
}
