import { isEmptyObject, isPlainObject } from 'es-toolkit'

import {
  EMPTY_INSTANCE_OVERRIDES,
  isEmptyInstanceOverrideState,
  type InstanceOverrideState
} from './instances/overrides'
import type { SceneNode, SourceMetadata } from './types'

/**
 * The empty list and record every layer holds until a field gets a value of its own. All layers
 * share them, so they are frozen: a field is replaced, never written into, and a write into one
 * throws instead of reaching every layer of every document.
 */
export const EMPTY_LIST: never[] = Object.freeze<never[]>([]) as never[]
export const EMPTY_RECORD: Record<string, never> = Object.freeze({})

/** The child list is the graph's to grow in place, so every layer keeps its own. */
const OWN_LIST_FIELDS: ReadonlySet<string> = new Set<keyof SceneNode>(['childIds'])

/** Fields keyed by name, such as bindings and property values, that start empty. */
const RECORD_FIELDS: ReadonlySet<string> = new Set<keyof SceneNode>([
  'componentPropertyAssignments',
  'componentPropertyValues',
  'boundVariables',
  'variableBindingScales',
  'variableAssignmentScales',
  'variableModes'
])

const SOURCE_LIST_FIELDS = ['editedFields'] as const
const FIG_SOURCE_LIST_FIELDS = [
  'symbolOverrides',
  'componentPropAssignments',
  'derivedSymbolData'
] as const

function sharedEmptyList(value: unknown): unknown {
  return Array.isArray(value) && value.length === 0 ? EMPTY_LIST : value
}

function sharedEmptyRecord(value: unknown): unknown {
  return isPlainObject(value) && isEmptyObject(value) ? EMPTY_RECORD : value
}

function sharedEmptyValue(field: string, value: unknown): unknown {
  if (field === 'instanceOverrides') return sharedEmptyOverrideState(value)
  if (Array.isArray(value)) return OWN_LIST_FIELDS.has(field) ? value : sharedEmptyList(value)
  return RECORD_FIELDS.has(field) ? sharedEmptyRecord(value) : value
}

/** An override state with nothing in it, so a layer that cleared its overrides shares the empty one. */
function sharedEmptyOverrideState(value: unknown): unknown {
  if (!isPlainObject(value)) return value
  const { self, descendants } = value as Partial<InstanceOverrideState>
  if (!(self instanceof Map) || !(descendants instanceof Map)) return value
  return isEmptyInstanceOverrideState(value as InstanceOverrideState)
    ? EMPTY_INSTANCE_OVERRIDES
    : value
}

/**
 * `record` with the empty lists among `lists` and the empty record at `recordField` swapped for
 * the shared ones: a copy when anything changes, so the caller's object is never written into.
 * A field the record lacks stays absent.
 */
function withSharedEmpties<T extends object>(
  record: T,
  lists: readonly string[],
  recordField?: string
): T {
  const fields: [string, (value: unknown) => unknown][] = lists.map((field) => [
    field,
    sharedEmptyList
  ])
  if (recordField !== undefined) fields.push([recordField, sharedEmptyRecord])
  let copy: T | null = null
  for (const [field, shared] of fields) {
    if (!Object.hasOwn(record, field)) continue
    const value: unknown = Reflect.get(record, field)
    const next = shared(value)
    if (next === value) continue
    copy ??= { ...record }
    Reflect.set(copy, field, next)
  }
  return copy ?? record
}

/**
 * Source metadata with its empty lists and raw fields swapped for the shared ones. The metadata
 * object and its `fig` part stay the layer's own, since readers and edits write their scalars in
 * place; metadata missing parts, as libraries and plugins may give, is kept as given.
 */
function withSharedEmptySource(source: SourceMetadata): SourceMetadata {
  const outer = withSharedEmpties(source, SOURCE_LIST_FIELDS)
  const fig: unknown = Reflect.get(source, 'fig')
  if (!isPlainObject(fig)) return outer
  const sharedFig = withSharedEmpties(fig, FIG_SOURCE_LIST_FIELDS, 'rawNodeFields')
  if (sharedFig === fig) return outer
  return { ...outer, fig: { ...source.fig, ...sharedFig } }
}

/**
 * Swap the `fields` of `node` that hold an empty list or record, its source metadata's included,
 * for the shared ones. Writing known keys keeps the shape every layer shares.
 */
export function shareEmptyNodeValues(node: SceneNode, fields: Iterable<string>): void {
  for (const field of fields) {
    const value: unknown = Reflect.get(node, field)
    if (field === 'source') {
      if (isPlainObject(value)) node.source = withSharedEmptySource(node.source)
      continue
    }
    const shared = sharedEmptyValue(field, value)
    if (shared !== value) Reflect.set(node, field, shared)
  }
}
