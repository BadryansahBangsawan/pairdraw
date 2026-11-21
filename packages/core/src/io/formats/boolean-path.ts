import type { CanvasKit } from 'canvaskit-wasm'

import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'

import type { SkiaRenderer } from '#core/canvas'
import { makeBooleanOperationPath } from '#core/canvas/boolean'

import { headlessRenderer } from './raster/headless'

/** Writes a boolean operation's live result path as SVG path data, or null when it has none. */
export type BooleanPathResolver = (graph: SceneGraph, node: SceneNode) => string | null

/** One resolver per renderer: a host's live one, or the offscreen renderer built for a CanvasKit. */
const resolvers = new WeakMap<SkiaRenderer, BooleanPathResolver>()
const pendingByCanvasKit = new WeakMap<CanvasKit, Promise<BooleanPathResolver>>()
let pending: Promise<BooleanPathResolver> | null = null

function resolverFor(renderer: SkiaRenderer): BooleanPathResolver {
  const cached = resolvers.get(renderer)
  if (cached) return cached
  const resolver: BooleanPathResolver = (graph, node) => {
    const path = makeBooleanOperationPath(renderer, node, graph)
    if (!path) return null
    const data = path.toSVGString()
    path.delete()
    return data
  }
  resolvers.set(renderer, resolver)
  return resolver
}

/**
 * A resolver that recomputes boolean geometry from the graph, through the same path operation the
 * canvas draws, so an export follows edits to the operands instead of a stored copy. A host that
 * already draws the document passes its CanvasKit and renderer, so the export never loads a
 * second CanvasKit; without them the offscreen renderer loads its own, as the CLI and MCP do.
 */
export function booleanPathResolver(
  canvasKit?: CanvasKit,
  renderer?: SkiaRenderer
): Promise<BooleanPathResolver> {
  if (renderer) return Promise.resolve(resolverFor(renderer))
  if (canvasKit) {
    let forKit = pendingByCanvasKit.get(canvasKit)
    if (!forKit) {
      forKit = headlessRenderer(canvasKit).then(({ renderer }) => resolverFor(renderer))
      pendingByCanvasKit.set(canvasKit, forKit)
    }
    return forKit
  }
  pending ??= headlessRenderer().then(({ renderer }) => resolverFor(renderer))
  return pending
}

/** Whether an export has to compute boolean geometry: a boolean contains no stored result path. */
export function needsBooleanPaths(graph: SceneGraph): boolean {
  return [...graph.getAllNodes()].some(
    (node) => node.type === 'BOOLEAN_OPERATION' && node.fillGeometry.length === 0
  )
}
