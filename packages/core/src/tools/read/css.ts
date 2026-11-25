import * as v from 'valibot'

import type { SceneGraph, SceneNode, ShadowEffect } from '@pairdraw/scene-graph'
import { colorToHex } from '@pairdraw/scene-graph/color'

import { defineTool, nodeIdsField, toolNumber } from '#core/tools/schema'

/**
 * A subtree as CSS-shaped lines: one line per node, lengths in px, colours as hex with the token
 * that binds them in `var(--name, #hex)` form. This is the read side of the CSS shorthand the
 * setters accept, so a value read here can be written back unchanged.
 */
export const DEFAULT_MAX_BYTES = 6000
export const HARD_MAX_BYTES = 20_000

const AXIS_JUSTIFY: Record<string, string> = {
  CENTER: 'center',
  MAX: 'end',
  SPACE_BETWEEN: 'space-between',
  SPACE_AROUND: 'space-around'
}

const AXIS_ITEMS: Record<string, string> = {
  CENTER: 'center',
  MAX: 'end',
  STRETCH: 'stretch',
  BASELINE: 'baseline'
}

/** A length as CSS writes it: whole px where it is whole, up to two decimals otherwise. */
function px(value: number): string {
  return `${Math.round(value * 100) / 100}px`
}

/**
 * The radius line, read the way `shape-details` reads corners: the per-corner fields while
 * `independentCorners` is set (the uniform field is stale then), four values in CSS order when
 * they differ, one otherwise. The four values write back through `set_radius`'s shorthand.
 */
function radiusOf(node: SceneNode): string | null {
  if (node.independentCorners) {
    const corners = [
      node.topLeftRadius,
      node.topRightRadius,
      node.bottomRightRadius,
      node.bottomLeftRadius
    ]
    if (corners.every((value) => value === corners[0])) {
      return corners[0] > 0 ? px(corners[0]) : null
    }
    return corners.map((value) => (value === 0 ? '0' : px(value))).join(' ')
  }
  return node.cornerRadius > 0 ? px(node.cornerRadius) : null
}

function box(value: number): string {
  return String(Math.round(value))
}

/** UTF-8 bytes without a Node Buffer, so the tool runs in the app as well as headless. */
function utf8Length(text: string): number {
  let bytes = 0
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index)
    if (code < 0x80) bytes += 1
    else if (code < 0x800) bytes += 2
    else if (code < 0xd800 || code >= 0xe000) bytes += 3
    else bytes += 4
  }
  return bytes
}

function boundName(graph: SceneGraph, node: SceneNode, field: string): string | null {
  const variableId = node.boundVariables[field]
  if (!variableId) return null
  return graph.variables.get(variableId)?.name ?? null
}

/** `#RRGGBB`, or `var(--token, #RRGGBB)` when a variable paints it. */
function paintOf(node: SceneNode, graph: SceneGraph, field: string, hex: string): string {
  const name = boundName(graph, node, field)
  return name ? `var(--${name}, ${hex})` : hex
}

function background(node: SceneNode, graph: SceneGraph): string | null {
  const index = node.fills.findIndex(
    (candidate) => candidate.type === 'SOLID' && candidate.visible
  )
  const solid = index === -1 ? undefined : node.fills[index]
  if (solid) {
    const hex = colorToHex({ ...solid.color, a: solid.opacity })
    return paintOf(node, graph, `fills/${index}/color`, hex)
  }
  const otherIndex = node.fills.findIndex((candidate) => candidate.visible)
  const other = otherIndex === -1 ? undefined : node.fills[otherIndex]
  if (!other) return null
  return other.type.startsWith('GRADIENT') ? 'gradient' : 'image'
}

function border(node: SceneNode, graph: SceneGraph): string | null {
  const index = node.strokes.findIndex((candidate) => candidate.visible)
  const stroke = index === -1 ? undefined : node.strokes[index]
  if (!stroke) return null
  const hex = colorToHex({ ...stroke.color, a: stroke.opacity })
  return `${px(stroke.weight)} ${paintOf(node, graph, `strokes/${index}/color`, hex)}`
}

/** Padding in CSS order, compressed to the fewest values that say the same thing. */
function padding(node: SceneNode): string | null {
  const top = node.paddingTop
  const right = node.paddingRight
  const bottom = node.paddingBottom
  const left = node.paddingLeft
  if (top === 0 && right === 0 && bottom === 0 && left === 0) return null
  if (top === right && right === bottom && bottom === left) return px(top)
  if (top === bottom && right === left) return `${px(top)} ${px(right)}`
  return `${px(top)} ${px(right)} ${px(bottom)} ${px(left)}`
}

function shadowOf(prefix: string, effect: ShadowEffect): string {
  return `${prefix}:${px(effect.offset.x)} ${px(effect.offset.y)} ${px(effect.radius)} ${colorToHex(effect.color)}`
}

function effects(node: SceneNode): string[] {
  const out: string[] = []
  for (const effect of node.effects) {
    if (!effect.visible) continue
    if (effect.type === 'DROP_SHADOW') out.push(shadowOf('shadow', effect))
    else if (effect.type === 'INNER_SHADOW') out.push(shadowOf('inner-shadow', effect))
    else if (effect.type === 'LAYER_BLUR' || effect.type === 'FOREGROUND_BLUR')
      out.push(`blur:${px(effect.radius)}`)
    else out.push('backdrop-blur')
  }
  return out
}

function layoutDecls(node: SceneNode): string[] {
  if (node.layoutMode === 'NONE') return []
  const out = [node.layoutMode === 'HORIZONTAL' ? 'flex:row' : 'flex:column']
  if (node.itemSpacing > 0) {
    out.push(
      node.layoutWrap === 'WRAP' && node.counterAxisSpacing > 0
        ? `gap:${px(node.itemSpacing)} ${px(node.counterAxisSpacing)}`
        : `gap:${px(node.itemSpacing)}`
    )
  }
  const paddingValue = padding(node)
  if (paddingValue) out.push(`padding:${paddingValue}`)
  const justify = AXIS_JUSTIFY[node.primaryAxisAlign]
  if (justify) out.push(`justify:${justify}`)
  const items = AXIS_ITEMS[node.counterAxisAlign]
  if (items) out.push(`items:${items}`)
  if (node.layoutWrap === 'WRAP') out.push('wrap')
  if (node.primaryAxisSizing === 'HUG') out.push('hug:main')
  if (node.counterAxisSizing === 'HUG') out.push('hug:cross')
  return out
}

function boxDecls(node: SceneNode, graph: SceneGraph): string[] {
  const out: string[] = []
  if (node.layoutAlignSelf === 'STRETCH') out.push('stretch')
  if (node.layoutGrow > 0) out.push(`grow:${Math.round(node.layoutGrow * 100) / 100}`)
  const bg = background(node, graph)
  if (bg) out.push(`bg:${bg}`)
  const stroke = border(node, graph)
  if (stroke) out.push(`border:${stroke}`)
  const radius = radiusOf(node)
  if (radius) out.push(`radius:${radius}`)
  if (node.minWidth !== null) out.push(`min-w:${px(node.minWidth)}`)
  if (node.maxWidth !== null) out.push(`max-w:${px(node.maxWidth)}`)
  if (node.minHeight !== null) out.push(`min-h:${px(node.minHeight)}`)
  if (node.maxHeight !== null) out.push(`max-h:${px(node.maxHeight)}`)
  out.push(...effects(node))
  if (node.opacity !== 1) out.push(`opacity:${Math.round(node.opacity * 100) / 100}`)
  if (node.clipsContent) out.push('clip')
  return out
}

function lineHeightOf(node: SceneNode): string {
  const lineHeight = node.lineHeight
  if (!lineHeight) return 'auto'
  return lineHeight.unit === 'PERCENT'
    ? `${Math.round(lineHeight.value * 100) / 100}%`
    : px(lineHeight.value)
}

function textDecls(node: SceneNode, graph: SceneGraph): string[] {
  const out = [`font:${node.fontWeight} ${px(node.fontSize)}/${lineHeightOf(node)} ${node.fontFamily}`]
  const bg = background(node, graph)
  if (bg) out.push(`color:${bg}`)
  if (node.textAlignHorizontal !== 'LEFT') {
    out.push(`text-align:${node.textAlignHorizontal.toLowerCase()}`)
  }
  if (node.maxLines !== null && node.maxLines > 0) out.push(`max-lines:${node.maxLines}`)
  if (node.textAutoResize === 'NONE') out.push('fixed')
  return out
}

function lineOf(node: SceneNode, graph: SceneGraph): string {
  const decls =
    node.type === 'TEXT' ? textDecls(node, graph) : [...layoutDecls(node), ...boxDecls(node, graph)]
  const label =
    node.type === 'TEXT'
      ? `"${node.text.slice(0, 40).replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n')}"`
      : node.name
  const body = decls.length > 0 ? ` {${decls.join(';')}}` : ''
  return `${label}#${node.id} ${box(node.width)}×${box(node.height)}${body}`
}

interface Budget {
  bytes: number
  limit: number
  truncated: boolean
}

/** What a cut-off walk left out, counted through the same visible-node rule as the lines. */
function countVisible(graph: SceneGraph, nodeId: string): number {
  const node = graph.getNode(nodeId)
  if (!node || !node.visible) return 0
  let count = 1
  for (const childId of node.childIds) count += countVisible(graph, childId)
  return count
}

function truncationTail(omitted: number): string {
  return `… +${omitted} node${omitted === 1 ? '' : 's'} (raise max_bytes or narrow with depth)`
}

/**
 * Depth-first lines until the budget is spent. `firstLineAlways` keeps the subtree's first node
 * even when it alone overflows a tight budget (a single-node read); a block in an `ids` reply
 * instead gives up whole when nothing fits, so the reply's shared budget holds.
 */
function collect(
  graph: SceneGraph,
  nodeId: string,
  depth: number,
  indent: string,
  lines: string[],
  budget: Budget,
  firstLineAlways: boolean
): void {
  const node = graph.getNode(nodeId)
  if (!node || !node.visible) return
  if (budget.truncated) return
  const line = `${indent}${lineOf(node, graph)}`
  const firstLine = lines.length === 0
  const fits = budget.bytes + utf8Length(line) + 1 <= budget.limit
  if (!fits && !(firstLine && firstLineAlways)) {
    budget.truncated = true
    return
  }
  budget.bytes += utf8Length(line) + 1
  lines.push(line)
  if (depth > 0) {
    for (const childId of node.childIds) {
      collect(graph, childId, depth - 1, `${indent}  `, lines, budget, firstLineAlways)
    }
  }
}

/**
 * A subtree within `maxBytes`. The truncation tail is charged to the same budget, so trailing
 * lines give way until head and tail fit; only a single line that alone overflows a budget
 * smaller than it (a single-node read) may land over.
 */
function blockFor(
  graph: SceneGraph,
  nodeId: string,
  depth: number,
  maxBytes: number,
  firstLineAlways = true
): { css: string; truncated?: true; omitted?: number } {
  const lines: string[] = []
  const budget: Budget = { bytes: 0, limit: maxBytes, truncated: false }
  collect(graph, nodeId, depth, '', lines, budget, firstLineAlways)
  if (!budget.truncated) return { css: lines.join('\n') }
  // Every visible node either has a line or is left out, so the omitted count follows from the
  // node total. Each dropped line's byte count includes the newline collect charged for it.
  let omitted = countVisible(graph, nodeId) - lines.length
  while (
    lines.length > (firstLineAlways ? 1 : 0) &&
    budget.bytes + 1 + utf8Length(truncationTail(omitted)) > budget.limit
  ) {
    const last = lines.pop()
    if (last === undefined) break
    budget.bytes -= utf8Length(last) + 1
    omitted = countVisible(graph, nodeId) - lines.length
  }
  if (lines.length === 0) {
    return { css: '', truncated: true, omitted: countVisible(graph, nodeId) }
  }
  return { css: [...lines, truncationTail(omitted)].join('\n'), truncated: true, omitted }
}

export const getCSS = defineTool({
  name: 'get_css',
  description:
    'Read a node subtree as compact CSS-like lines: `Name#id W×H {flex:row;gap:12px;padding:16px 24px;bg:var(--color/brand, #4F46E5);radius:8px}`. ' +
    'Lengths are px; short names: flex (implies display:flex), gap, padding, justify, items, wrap, hug, stretch, grow, bg, border, radius, min/max-w/h, shadow, blur, opacity, clip; text: `font:600 14px/20px Inter`, color, text-align, max-lines. ' +
    'Use it for geometry and style; describe gives roles and design issues. The setters accept the same shorthand (padding/gap/radius strings, `var(--token)` colours).',
  execution: { kind: 'sync', mutation: 'none' },
  input: v.strictObject({
    id: v.optional(v.pipe(v.string(), v.description('Node ID (single node)'))),
    ids: nodeIdsField('Node IDs (several nodes in one call)'),
    depth: v.optional(
      toolNumber(
        v.pipe(v.number(), v.description('Child levels to include (default: as many as the budget holds)'))
      )
    ),
    max_bytes: v.optional(
      toolNumber(v.pipe(v.number(), v.description('Byte budget for the reply (default 6000, max 20000)')))
    )
  }),
  execute: (figma, args) => {
    const maxBytes = Math.min(args.max_bytes ?? DEFAULT_MAX_BYTES, HARD_MAX_BYTES)
    const depth = args.depth ?? 100

    if (args.ids && Array.isArray(args.ids)) {
      const blocks: string[] = []
      let omitted = 0
      let truncated = false
      let used = 0
      for (const nodeId of args.ids) {
        if (!figma.graph.getNode(nodeId)) return { error: `Node "${nodeId}" not found` }
        const separator = blocks.length === 0 ? 0 : 1
        const block = blockFor(figma.graph, nodeId, depth, maxBytes - used - separator, false)
        if (block.css === '') {
          omitted += block.omitted ?? 0
          truncated = truncated || block.truncated === true
          continue
        }
        blocks.push(block.css)
        used += utf8Length(block.css) + separator
        omitted += block.omitted ?? 0
        truncated = truncated || block.truncated === true
      }
      const css = blocks.join('\n')
      if (!truncated) return { ids: args.ids, css }
      return { ids: args.ids, css, truncated: true, omitted }
    }

    if (!args.id) return { error: 'Provide id (string) or ids (string[])' }
    if (!figma.graph.getNode(args.id)) return { error: `Node "${args.id}" not found` }
    const block = blockFor(figma.graph, args.id, depth, maxBytes)
    return { id: args.id, ...block }
  }
})
