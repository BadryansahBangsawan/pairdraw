import type { CanvasKit } from 'canvaskit-wasm'

import { SceneGraph, type Fill, type Stroke } from '@pairdraw/scene-graph'
import { computeImageHash } from '@pairdraw/scene-graph/images'

import { hasImageAdjustments } from '#core/canvas/images/adjustments'
import type { SkiaRenderer } from '#core/canvas/renderer'
import { getCanvasKit } from '#core/canvaskit'

import { headlessRenderNodes } from './headless'
import { renderNodesToImage } from './render'

/** The paints of a node that are images with adjustments a vector format must bake. */
function adjustedPaints(node: { fills?: Fill[]; strokes?: Stroke[] }): (Fill | Stroke)[] {
  return [...(node.fills ?? []), ...(node.strokes ?? [])].filter(
    (paint): paint is Fill | Stroke =>
      paint.type === 'IMAGE' && !!paint.imageHash && hasImageAdjustments(paint.filters)
  )
}

/** Every node under `nodeIds`, each once. */
function subtree(graph: SceneGraph, nodeIds: readonly string[]) {
  const pending = [...nodeIds]
  const seen = new Set<string>()
  const nodes = []
  while (pending.length > 0) {
    const id = pending.pop()
    if (id === undefined || seen.has(id)) continue
    seen.add(id)
    const node = graph.getNode(id)
    if (!node) continue
    nodes.push(node)
    pending.push(...node.childIds)
  }
  return nodes
}

/** Whether any paint under `nodeIds` is an image with adjustments the vector formats must bake. */
export function hasAdjustedImagePaints(graph: SceneGraph, nodeIds: readonly string[]): boolean {
  return subtree(graph, nodeIds).some((node) => adjustedPaints(node).length > 0)
}

function bakedHash(paint: Fill | Stroke, baked: Map<string, string>): string | null {
  if (paint.type !== 'IMAGE' || !hasImageAdjustments(paint.filters) || !paint.imageHash) return null
  return baked.get(`${paint.imageHash}:${JSON.stringify(paint.filters)}`) ?? null
}

/** `paint` drawing its baked PNG with no adjustments left, when one was baked for it. */
function withBakedImage<P extends Fill | Stroke>(paint: P, baked: Map<string, string>): P {
  const hash = bakedHash(paint, baked)
  if (!hash || paint.type !== 'IMAGE') return paint
  const copy = { ...paint, imageHash: hash }
  delete copy.filters
  return copy
}

/**
 * The graph with every adjusted image paint replaced by the PNG the raster pipeline draws for it
 * at the image's own size, so a vector format embeds the adjusted pixels instead of the untouched
 * bytes. The original graph is not changed: nodes and images are copied, the rest is shared.
 */
export async function bakeAdjustedImages(
  graph: SceneGraph,
  nodeIds: readonly string[],
  canvasKit?: CanvasKit,
  renderer?: SkiaRenderer
): Promise<SceneGraph> {
  const ck = canvasKit ?? (await getCanvasKit())
  const baked = new Map<string, string>()
  const pngs = new Map<string, Uint8Array>()
  for (const node of subtree(graph, nodeIds)) {
    for (const paint of adjustedPaints(node)) {
      if (paint.type !== 'IMAGE' || !paint.imageHash || !hasImageAdjustments(paint.filters))
        continue
      const key = `${paint.imageHash}:${JSON.stringify(paint.filters)}`
      if (baked.has(key)) continue
      const source = graph.images.get(paint.imageHash)
      if (!source) continue
      const decoded = ck.MakeImageFromEncoded(source)
      if (!decoded) continue
      const width = decoded.width()
      const height = decoded.height()
      decoded.delete()
      const temp = new SceneGraph()
      temp.images.set(paint.imageHash, source)
      const pageId = temp.getPages()[0].id
      const layer = temp.createNode('RECTANGLE', pageId, {
        width,
        height,
        fills: [{ ...paint, imageScaleMode: 'FILL', opacity: 1, visible: true }]
      })
      let png: Uint8Array | null
      if (renderer) {
        renderer.invalidateAllPictures()
        await renderer.prepareForExport(temp, pageId, [layer.id])
        png = renderNodesToImage(ck, renderer, temp, pageId, [layer.id], {
          scale: 1,
          format: 'PNG'
        })
      } else {
        png = await headlessRenderNodes(temp, pageId, [layer.id], { scale: 1, format: 'PNG' }, ck)
      }
      if (!png) continue
      const hash = computeImageHash(png)
      pngs.set(hash, png)
      baked.set(key, hash)
    }
  }
  if (baked.size === 0) return graph

  const clone = Object.create(SceneGraph.prototype) as SceneGraph
  Object.assign(clone, graph)
  clone.images = new Map(graph.images)
  for (const [hash, png] of pngs) clone.images.set(hash, png)
  clone.nodes = new Map()
  for (const [id, node] of graph.nodes) {
    const fills = node.fills.map((paint) => withBakedImage(paint, baked))
    const strokes = node.strokes.map((paint) => withBakedImage(paint, baked))
    const changed =
      fills.some((paint, i) => paint !== node.fills[i]) ||
      strokes.some((paint, i) => paint !== node.strokes[i])
    clone.nodes.set(id, changed ? { ...node, fills, strokes } : node)
  }
  return clone
}
