import { converter } from 'culori'
import { uniqBy } from 'es-toolkit/array'

import type { SceneGraph, SceneNode, Variable, VariableScope } from '@pairdraw/scene-graph'
import { colorToHex } from '@pairdraw/scene-graph/color'
import {
  DESIGN_MEMORY_GROUPS,
  type DesignMemory,
  type DesignMemoryEnforcement,
  type DesignMemoryGroup
} from '@pairdraw/scene-graph/design-memory'
import type { Color } from '@pairdraw/scene-graph/primitives'
import { resolveVariable } from '@pairdraw/scene-graph/variables'

/** One value a group allows, with the variable or style that gives it, when one does. */
export interface AllowedValue<T> {
  value: T
  /** The variable's or style's name; null for a value the person added. */
  name: string | null
  /** The variable that holds it, which a fix binds; null for a style's or the person's. */
  variableId: string | null
}

export interface DesignGroupRules<T> {
  /** `off` too for a group with nothing to allow, which never refuses everything. */
  enforce: DesignMemoryEnforcement
  fromSystem: boolean
  allowed: AllowedValue<T>[]
}

/** A document's memory with each group's allowed values resolved from the document. */
export interface DesignRules {
  memory: DesignMemory
  colors: DesignGroupRules<string>
  fonts: DesignGroupRules<string>
  fontSizes: DesignGroupRules<number>
  spacing: DesignGroupRules<number>
  radius: DesignGroupRules<number>
}

/** How far apart in OKLab two colors may be and still count as one: about a just-noticeable difference. */
export const COLOR_TOLERANCE = 0.02
/** How far apart two numbers may be and still count as one, for rounding noise. */
export const NUMBER_TOLERANCE = 0.01

type Collected = {
  [G in DesignMemoryGroup]: AllowedValue<G extends 'colors' | 'fonts' ? string : number>[]
}

/** The numeric groups a FLOAT variable's scope puts it in; a variable for every scope is in none. */
const FLOAT_SCOPES: Partial<Record<VariableScope, 'fontSizes' | 'spacing' | 'radius'>> = {
  FONT_SIZE: 'fontSizes',
  GAP: 'spacing',
  CORNER_RADIUS: 'radius'
}

/** What a variable resolves to in each mode of its collection. */
function modeValues(graph: SceneGraph, variable: Variable): unknown[] {
  const collection = graph.variableCollections.get(variable.collectionId)
  const modes = collection?.modes.map((mode) => mode.modeId) ?? Object.keys(variable.valuesByMode)
  return modes.map((modeId) => {
    try {
      return resolveVariable(graph, variable.id, modeId)
    } catch {
      return undefined
    }
  })
}

/** Whether a variable's value is a color. */
export function isColor(value: unknown): value is Color {
  return typeof value === 'object' && value !== null && 'r' in value && 'g' in value && 'b' in value
}

/** A value a variable or a style gives a group of the memory. */
export interface SystemValue {
  group: DesignMemoryGroup
  value: string | number
}

/**
 * The values a variable gives the memory, in every mode of its collection: a color variable's
 * colors, a font family variable's families, and a number scoped to font sizes, gaps or corner
 * radii. A number for every scope is in no group.
 */
export function variableValues(graph: SceneGraph, variable: Variable): SystemValue[] {
  if (variable.type === 'COLOR') {
    return modeValues(graph, variable).flatMap((value) =>
      isColor(value) ? [{ group: 'colors' as const, value: colorToHex(value) }] : []
    )
  }
  const scopes = variable.scopes ?? []
  if (variable.type === 'STRING') {
    if (!scopes.includes('FONT_FAMILY')) return []
    return modeValues(graph, variable).flatMap((value) =>
      typeof value === 'string' && value.trim()
        ? [{ group: 'fonts' as const, value: value.trim() }]
        : []
    )
  }
  if (variable.type !== 'FLOAT') return []
  return scopes.flatMap((scope) => {
    const group = FLOAT_SCOPES[scope]
    if (!group) return []
    return modeValues(graph, variable).flatMap((value) =>
      typeof value === 'number' && Number.isFinite(value) ? [{ group, value }] : []
    )
  })
}

function solidColors(node: SceneNode): string[] {
  return [...node.fills, ...node.strokes].flatMap((paint) =>
    paint.type === 'SOLID' && paint.visible ? [colorToHex(paint.color)] : []
  )
}

/** The values a fill, stroke or text style gives the memory, kept on the layer that defines it. */
export function styleValues(node: SceneNode): SystemValue[] {
  if (node.sharedStyleType === 'FILL')
    return solidColors(node).map((value) => ({ group: 'colors' as const, value }))
  if (node.sharedStyleType !== 'TEXT') return []
  const values: SystemValue[] = []
  if (node.fontFamily) values.push({ group: 'fonts', value: node.fontFamily })
  if (node.fontSize > 0) values.push({ group: 'fontSizes', value: node.fontSize })
  return values
}

/** Whether a layer defines a shared style, whose values join the system. */
export function isStyleNode(node: SceneNode): boolean {
  return node.sharedStyleType !== null && Boolean(node.source.id)
}

function collect(graph: SceneGraph, styleNodes: Iterable<SceneNode>): Collected {
  const collected: Collected = { colors: [], fonts: [], fontSizes: [], spacing: [], radius: [] }
  const push = (source: Omit<AllowedValue<unknown>, 'value'>, { group, value }: SystemValue) => {
    if (group === 'colors' || group === 'fonts') {
      if (typeof value === 'string') collected[group].push({ ...source, value })
    } else if (typeof value === 'number') collected[group].push({ ...source, value })
  }
  for (const variable of graph.variables.values()) {
    const source = { name: variable.name, variableId: variable.id }
    for (const value of variableValues(graph, variable)) push(source, value)
  }
  for (const node of styleNodes) {
    if (!isStyleNode(node)) continue
    const source = { name: node.name, variableId: null }
    for (const value of styleValues(node)) push(source, value)
  }
  return collected
}

function group<T>(
  memory: DesignMemory,
  name: DesignMemoryGroup,
  system: AllowedValue<T>[],
  own: readonly T[],
  key: (value: T) => string | number
): DesignGroupRules<T> {
  const settings = memory[name]
  // Each value once, the first source that gives it naming it.
  const allowed = uniqBy(
    [
      ...(settings.fromSystem ? system : []),
      ...own.map((value) => ({ value, name: null, variableId: null }))
    ],
    (entry) => key(entry.value)
  )
  return {
    enforce: allowed.length === 0 ? 'off' : settings.enforce,
    fromSystem: settings.fromSystem,
    allowed
  }
}

/**
 * The memory's rules with the document's variables and styles resolved into each group. Style
 * layers are found by walking the document unless `styleNodes` lists them.
 */
export function resolveDesignRules(
  graph: SceneGraph,
  memory: DesignMemory,
  styleNodes: Iterable<SceneNode> = graph.getAllNodes()
): DesignRules {
  const system = DESIGN_MEMORY_GROUPS.some((name) => memory[name].fromSystem)
  const collected = system
    ? collect(graph, styleNodes)
    : { colors: [], fonts: [], fontSizes: [], spacing: [], radius: [] }
  const exact = (value: string | number) => value
  const folded = (value: string) => value.toLowerCase()
  return {
    memory,
    colors: group(memory, 'colors', collected.colors, memory.colors.values, exact),
    fonts: group(memory, 'fonts', collected.fonts, memory.fonts.values, folded),
    fontSizes: group(memory, 'fontSizes', collected.fontSizes, memory.fontSizes.values, exact),
    spacing: group(memory, 'spacing', collected.spacing, memory.spacing.values, exact),
    radius: group(memory, 'radius', collected.radius, memory.radius.values, exact)
  }
}

const oklab = converter('oklab')

/**
 * A `#RRGGBB` color in OKLab. The channels are read from the hex directly and handed to culori
 * as numbers, which skips its CSS parser on the hot path of a large agent edit.
 */
function toOKLab(hex: string): { l: number; a: number; b: number } | undefined {
  const rgb = Number.parseInt(hex.slice(1), 16)
  if (hex.length !== 7 || Number.isNaN(rgb)) return undefined
  return oklab({
    mode: 'rgb',
    r: (rgb >> 16) / 255,
    g: ((rgb >> 8) & 255) / 255,
    b: (rgb & 255) / 255
  })
}

interface ColorPoint {
  allowed: AllowedValue<string>
  l: number
  a: number
  b: number
}

/** Each group's allowed colors in OKLab and by hex, made once rather than once per comparison. */
const colorPoints = new WeakMap<
  DesignGroupRules<string>,
  { points: ColorPoint[]; exact: Map<string, AllowedValue<string>> }
>()

function pointsOf(rules: DesignGroupRules<string>) {
  const known = colorPoints.get(rules)
  if (known) return known
  const points = rules.allowed.flatMap((allowed) => {
    const lab = toOKLab(allowed.value)
    return lab ? [{ allowed, l: lab.l, a: lab.a, b: lab.b }] : []
  })
  const exact = new Map(rules.allowed.map((allowed) => [allowed.value, allowed] as const))
  const index = { points, exact }
  colorPoints.set(rules, index)
  return index
}

/** The allowed color closest to `hex`, with how far it is. */
export function nearestColor(
  rules: DesignGroupRules<string>,
  hex: string
): { allowed: AllowedValue<string>; distance: number } | null {
  const { points, exact } = pointsOf(rules)
  const same = exact.get(hex)
  if (same) return { allowed: same, distance: 0 }
  const lab = toOKLab(hex)
  if (!lab) return null
  let best: ColorPoint | null = null
  let bestSquared = Infinity
  for (const point of points) {
    const squared = (point.l - lab.l) ** 2 + (point.a - lab.a) ** 2 + (point.b - lab.b) ** 2
    if (squared < bestSquared) {
      best = point
      bestSquared = squared
    }
  }
  return best ? { allowed: best.allowed, distance: Math.sqrt(bestSquared) } : null
}

/** The allowed number closest to `value`. */
export function nearestNumber(
  rules: DesignGroupRules<number>,
  value: number
): AllowedValue<number> | null {
  let best: AllowedValue<number> | null = null
  for (const allowed of rules.allowed)
    if (!best || Math.abs(allowed.value - value) < Math.abs(best.value - value)) best = allowed
  return best
}
