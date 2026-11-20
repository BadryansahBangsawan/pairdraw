import { fromUint8Array } from 'js-base64'
import * as v from 'valibot'

import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { computeAbsoluteBounds } from '@pairdraw/scene-graph/geometry'

import { extractExportGraph } from '#core/io/subgraph'
import { computeLayout, measureTextForLayout, sizeAutoResizingText } from '#core/layout'
import { collectNodeFontFaces } from '#core/text/requirements/collect'
import { computeOverlaps, type OverlapItem, type OverlapSeverity } from '#core/tools/analyze/overlaps'
import { defineTool, nodeIdInputSchema, toolNumber } from '#core/tools/schema'
import { boundedRasterScale, rasterScaleInputs } from '#core/tools/vector/export'

const DEFAULT_WIDTHS = [375, 768, 1280]
const DEFAULT_MAX_WARNINGS = 20
/** A layer is outside its frame, or text overflows its box, only past this many pixels. */
const TOLERANCE = 1

export type ResponsiveWarningKind =
  | 'text-overflow'
  | 'text-truncated'
  | 'child-outside-frame'
  | 'sibling-overlap'

export interface ResponsiveWarning {
  kind: ResponsiveWarningKind
  severity: OverlapSeverity | 'warning'
  node_id: string
  node_name: string
  message: string
}

interface Collected {
  warnings: ResponsiveWarning[]
  /** Warnings dropped for this width because `max_warnings` was reached. */
  dropped: number
}

function isContainer(node: SceneNode): boolean {
  return node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE'
}

function isVisible(node: SceneNode, graph: SceneGraph): boolean {
  let current: SceneNode | undefined = node
  while (current) {
    if (!current.visible) return false
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return true
}

function descendants(graph: SceneGraph, rootId: string): SceneNode[] {
  const nodes: SceneNode[] = []
  const stack = [...(graph.getNode(rootId)?.childIds ?? [])].reverse()
  while (stack.length > 0) {
    const node = graph.getNode(stack.pop() ?? '')
    if (!node) continue
    nodes.push(node)
    for (let index = node.childIds.length - 1; index >= 0; index--) {
      const childId = node.childIds[index]
      if (childId) stack.push(childId)
    }
  }
  return nodes
}

/** Text whose measured height no longer fits the box it was given. */
function textWarnings(node: SceneNode): ResponsiveWarning[] {
  if (node.type !== 'TEXT' || !node.text) return []
  const truncates = node.textAutoResize === 'TRUNCATE' || node.textTruncation === 'ENDING'
  const fixed = node.textAutoResize === 'NONE' || node.textAutoResize === 'TRUNCATE'
  if (!fixed) return []
  const measured = measureTextForLayout(node, node.width).height
  if (measured <= node.height + TOLERANCE) return []
  return [
    truncates
      ? {
          kind: 'text-truncated',
          severity: 'info',
          node_id: node.id,
          node_name: node.name,
          message: `Text is truncated: ${Math.round(measured)}px of text in a ${Math.round(node.height)}px box`
        }
      : {
          kind: 'text-overflow',
          severity: 'warning',
          node_id: node.id,
          node_name: node.name,
          message: `Text overflows its box: ${Math.round(measured)}px of text in a ${Math.round(node.height)}px box`
        }
  ]
}

/** Direct children whose box reaches past the frame's own box. */
function outsideWarnings(graph: SceneGraph, frame: SceneNode): ResponsiveWarning[] {
  const frameBounds = computeAbsoluteBounds([frame], graph)
  const warnings: ResponsiveWarning[] = []
  for (const childId of frame.childIds) {
    const child = graph.getNode(childId)
    if (!child || !isVisible(child, graph)) continue
    const bounds = computeAbsoluteBounds([child], graph)
    const outside =
      bounds.x < frameBounds.x - TOLERANCE ||
      bounds.y < frameBounds.y - TOLERANCE ||
      bounds.x + bounds.width > frameBounds.x + frameBounds.width + TOLERANCE ||
      bounds.y + bounds.height > frameBounds.y + frameBounds.height + TOLERANCE
    if (!outside) continue
    warnings.push({
      kind: 'child-outside-frame',
      severity: 'warning',
      node_id: child.id,
      node_name: child.name,
      message: `${child.name} reaches outside the ${Math.round(frame.width)}px frame`
    })
  }
  return warnings
}

function laterSibling(graph: SceneGraph, item: OverlapItem): { later: string; earlier: string } {
  const parentId = item.nodeA.parentId
  const order = parentId ? (graph.getNode(parentId)?.childIds ?? []) : []
  const a = order.indexOf(item.nodeA.id)
  const b = order.indexOf(item.nodeB.id)
  return b >= a
    ? { later: item.nodeB.id, earlier: item.nodeA.id }
    : { later: item.nodeA.id, earlier: item.nodeB.id }
}

function overlapWarnings(
  graph: SceneGraph,
  pageId: string,
  limit: number
): ResponsiveWarning[] {
  if (limit <= 0) return []
  const result = computeOverlaps(graph, { scope: 'same-parent', page_id: pageId, limit })
  const warnings: ResponsiveWarning[] = []
  for (const item of result.overlaps) {
    if (item.category !== 'sibling-overlap') continue
    const { later, earlier } = laterSibling(graph, item)
    const node = graph.getNode(later)
    warnings.push({
      kind: 'sibling-overlap',
      severity: item.severity,
      node_id: later,
      node_name: node?.name ?? later,
      message: `${node?.name ?? later} overlaps ${graph.getNode(earlier)?.name ?? earlier}`
    })
    if (warnings.length >= limit) break
  }
  return warnings
}

function collectWarnings(
  graph: SceneGraph,
  frame: SceneNode,
  pageId: string,
  maxWarnings: number
): Collected {
  const found: ResponsiveWarning[] = [
    ...outsideWarnings(graph, frame),
    ...descendants(graph, frame.id).flatMap((node) => textWarnings(node)),
    ...overlapWarnings(graph, pageId, maxWarnings)
  ]
  return {
    warnings: found.slice(0, maxWarnings),
    dropped: Math.max(0, found.length - maxWarnings)
  }
}

/** The width a copy is laid out at, never below one pixel. */
function clampWidth(width: number): number {
  return Math.max(1, Math.round(width))
}

export const checkResponsive = defineTool({
  name: 'check_responsive',

  description:
    'Lay out and render a copy of a frame at several viewport widths without changing the document, and report text overflow, layers outside the frame, and overlapping siblings at each width. Auto-layout children reflow; children placed by free x/y keep their position, as constraints are not applied.',
  execution: { kind: 'async', mutation: 'none' },
  exposure: { webmcp: false },
  input: v.strictObject({
    id: nodeIdInputSchema,
    widths: v.optional(
      v.pipe(
        v.array(toolNumber(v.pipe(v.number(), v.minValue(1), v.maxValue(4096)))),
        v.minLength(1),
        v.maxLength(12),
        v.description('Viewport widths to test in the same units as the frame (default: 375, 768, 1280)')
      )
    ),
    max_warnings: v.optional(
      toolNumber(
        v.pipe(
          v.number(),
          v.minValue(0),
          v.maxValue(200),
          v.description('Warnings reported per width (default: 20)')
        )
      ),
      DEFAULT_MAX_WARNINGS
    ),
    ...rasterScaleInputs
  }),
  // Every face the frame draws text with must load before the copy is measured.
  fonts: (figma, { id }) => {
    const node = figma.graph.getNode(id)
    return node ? descendants(figma.graph, node.id).flatMap(collectNodeFontFaces) : []
  },
  execute: async (figma, args) => {
    const node = figma.graph.getNode(args.id)
    if (!node) return { error: `Node "${args.id}" not found` }
    if (!isContainer(node)) {
      return { error: `Node "${args.id}" is a ${node.type}; check_responsive needs a frame` }
    }
    if (!figma.exportGraphImage) {
      return { error: 'Responsive rendering is not available in this environment' }
    }

    const widths = (args.widths ?? DEFAULT_WIDTHS).map(clampWidth)
    const maxWarnings = args.max_warnings
    const results = []

    for (const width of widths) {
      const extracted = extractExportGraph(figma.graph, { scope: 'node', nodeId: node.id })
      const copy = extracted.graph
      const pageId = extracted.pageId ?? figma.currentPageId
      const target = copy.getNode(node.id)
      if (!target) continue

      copy.updateNode(node.id, { width })
      sizeAutoResizingText(copy, node.id)
      computeLayout(copy, node.id)

      const laid = copy.getNode(node.id) ?? target
      const { warnings, dropped } = collectWarnings(copy, laid, pageId, maxWarnings)
      const scale = boundedRasterScale(laid.width, laid.height, args.scale, args.maxEdge)
      const bytes = await figma.exportGraphImage(copy, pageId, [node.id], {
        scale,
        format: 'PNG'
      })
      if (!bytes) return { error: `Width ${width} could not be rendered` }

      results.push({
        width,
        height: Math.round(laid.height),
        mimeType: 'image/png',
        base64: fromUint8Array(bytes),
        byteLength: bytes.length,
        warnings,
        ...(dropped > 0 ? { dropped_warnings: dropped } : {})
      })
    }

    return {
      id: node.id,
      name: node.name,
      widths: results,
      warningCount: results.reduce((total, entry) => total + entry.warnings.length, 0)
    }
  }
})
