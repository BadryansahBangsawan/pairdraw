import {
  comparePNGs,
  computeContentBounds,
  createCanvasKitRasterCodec,
  renderRegionToImage
} from '@pairdraw/core/io/formats/raster'
import type { SceneGraph } from '@pairdraw/scene-graph'
import {
  intersectVisualBounds,
  nodeVisualBounds,
  type VisualBounds
} from '@pairdraw/scene-graph/geometry'

import { boundedImageScale } from '@/app/ai/tools/vision/inspect'
import type { EditorStore } from '@/app/editor/active-store'
import type { ChangePreviewSize } from '@/app/settings/preferences/store'

import type { ToolChangeImages } from './types'

/** Longest stored image edge, in pixels, for each preview size. */
const CHANGE_PREVIEW_MAX_EDGE: Record<Exclude<ChangePreviewSize, 'off'>, number> = {
  small: 240,
  medium: 480,
  large: 960
}

/** Context kept around the changed layers, in document units. */
const REGION_MARGIN = 16

/** What a change preview draws: one region of a page, in frozen copies of both states. */
export interface ChangeRegion {
  beforeGraph: SceneGraph
  afterGraph: SceneGraph
  pageId: string
  bounds: VisualBounds
  size: Exclude<ChangePreviewSize, 'off'>
}

function regionOf(graph: SceneGraph, nodeIds: string[]): VisualBounds | null {
  const present = nodeIds.filter((id) => graph.getNode(id) !== undefined)
  return present.length > 0 ? computeContentBounds(graph, present) : null
}

/** The region around the changed layers in either state, with some context around it. */
export function changeBounds(
  beforeGraph: SceneGraph,
  afterGraph: SceneGraph,
  nodeIds: string[]
): VisualBounds | null {
  const known = [regionOf(beforeGraph, nodeIds), regionOf(afterGraph, nodeIds)].filter(
    (region) => region !== null
  )
  if (known.length === 0) return null
  return {
    minX: Math.min(...known.map((region) => region.minX)) - REGION_MARGIN,
    minY: Math.min(...known.map((region) => region.minY)) - REGION_MARGIN,
    maxX: Math.max(...known.map((region) => region.maxX)) + REGION_MARGIN,
    maxY: Math.max(...known.map((region) => region.maxY)) + REGION_MARGIN
  }
}

/** Whether anything of the layer may be drawn inside `bounds`. */
function mayDrawIn(graph: SceneGraph, id: string, bounds: VisualBounds): boolean {
  const node = graph.getNode(id)
  if (!node?.visible) return false
  // A layer that clips its content draws nothing outside its own bounds, so its sublayers,
  // often most of the page, need no measuring.
  const clips =
    node.clipsContent &&
    (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE')
  const drawn = clips
    ? nodeVisualBounds(node, (nodeId) => graph.getAbsolutePosition(nodeId))
    : computeContentBounds(graph, [id])
  return drawn !== null && intersectVisualBounds(drawn, bounds) !== null
}

/**
 * The page's top-level layers, other than `except`, that may draw into `bounds`, so a preview
 * built from only the changed layers still shows what lies over or under them.
 */
export function layersInBounds(
  graph: SceneGraph,
  pageId: string,
  bounds: VisualBounds,
  except: ReadonlySet<string>
): string[] {
  const childIds = graph.getNode(pageId)?.childIds ?? []
  return childIds.filter((id) => !except.has(id) && mayDrawIn(graph, id, bounds))
}

function pngBlob(bytes: Uint8Array | null): Blob | null {
  return bytes ? new Blob([new Uint8Array(bytes)], { type: 'image/png' }) : null
}

/**
 * Renders the changed region in both states at the same bounds and scale, and highlights the
 * pixels that differ. The preview queue runs it between tool calls, so the model never waits.
 */
export async function renderToolChangeImages(
  store: EditorStore,
  { beforeGraph, afterGraph, pageId, bounds, size }: ChangeRegion
): Promise<ToolChangeImages | null> {
  const renderer = store.renderer
  if (!renderer) return null
  const scale = boundedImageScale(
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
    CHANGE_PREVIEW_MAX_EDGE[size]
  )
  if (scale <= 0) return null
  const { ck, pageColor } = renderer
  const [before, after] = await Promise.all([
    renderRegionToImage(ck, beforeGraph, pageId, bounds, scale, { pageColor }),
    renderRegionToImage(ck, afterGraph, pageId, bounds, scale, { pageColor })
  ])
  const comparison =
    before && after ? comparePNGs(createCanvasKitRasterCodec(ck), before, after) : null
  return {
    before: pngBlob(before),
    after: pngBlob(after),
    highlight: pngBlob(comparison?.mask ?? null),
    width: comparison?.width ?? 0,
    height: comparison?.height ?? 0,
    changedRatio: comparison ? comparison.changedPixels / comparison.totalPixels : 0
  }
}
