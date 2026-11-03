import { canHoldImageFill } from '@open-pencil/core/tools'
import { vectorizableImageFill } from '@open-pencil/core/vector'
import type { Fill, SceneNode } from '@open-pencil/scene-graph'
import { TRANSPARENT } from '@open-pencil/scene-graph/constants'
import type { Vector } from '@open-pencil/scene-graph/primitives'

import type { EditorStore } from '@/app/editor/active-store'

/** The one selected layer, or null with none or several. */
export function singleSelectedNode(store: EditorStore): SceneNode | null {
  if (store.state.selectedIds.size !== 1) return null
  const [id] = store.state.selectedIds
  return id ? (store.graph.getNode(id) ?? null) : null
}

/**
 * Swaps the image a layer shows for `bytes`, keeping how the fill frames it, as one undo step of
 * its own; false when the layer or that image went while the service worked.
 */
export function replaceImageFill(
  store: EditorStore,
  nodeId: string,
  previousHash: string,
  bytes: Uint8Array,
  label: string
): boolean {
  const node = store.graph.getNode(nodeId)
  if (!node?.fills.some((fill) => fill.type === 'IMAGE' && fill.imageHash === previousHash)) {
    return false
  }
  const imageHash = store.storeImage(bytes)
  const fills = node.fills.map((fill) =>
    fill.type === 'IMAGE' && fill.imageHash === previousHash ? { ...fill, imageHash } : fill
  )
  // The result arrives after an await, so it never joins a batch another edit opened meanwhile.
  store.recordEdit({ label, ownStep: true }, () => store.updateNode(nodeId, { fills }))
  store.requestRender()
  return true
}

/** An image fill the picker set up without an image yet, as switching a paint to Image leaves. */
function isEmptyImageFill(fill: Fill): boolean {
  return fill.type === 'IMAGE' && fill.visible && !fill.imageHash
}

/** `fill` showing the image `imageHash`, keeping how it frames an image. */
function withImage(fill: Fill, imageHash: string): Fill {
  return { ...fill, type: 'IMAGE', imageHash, imageScaleMode: fill.imageScaleMode ?? 'FILL' }
}

/**
 * Shows a generated image on a layer as one undo step: in place of the image it showed, in its
 * image fill that has no image yet, or as a new topmost fill over the paints it has. False when
 * the layer went meanwhile.
 */
export function applyGeneratedImageFill(
  store: EditorStore,
  nodeId: string,
  bytes: Uint8Array,
  label: string
): boolean {
  const node = store.graph.getNode(nodeId)
  if (!node || !canHoldImageFill(node)) return false
  const current = vectorizableImageFill(node)
  if (current) return replaceImageFill(store, nodeId, current.imageHash, bytes, label)
  const empty = node.fills.findLastIndex(isEmptyImageFill)
  if (empty !== -1) return applyGeneratedImageToFill(store, nodeId, empty, undefined, bytes, label)
  const fill: Fill = {
    type: 'IMAGE',
    imageHash: store.storeImage(bytes),
    imageScaleMode: 'FILL',
    color: { ...TRANSPARENT },
    opacity: 1,
    visible: true
  }
  store.recordEdit({ label, ownStep: true }, () =>
    store.updateNode(nodeId, { fills: [...node.fills, fill] })
  )
  store.requestRender()
  return true
}

/**
 * Shows a generated image in one image fill of a layer, the one at `fillIndex`, keeping how it
 * frames an image, as one undo step. False when that fill went or shows another image meanwhile:
 * `previousHash` is the image it showed when the request started, undefined for none.
 */
export function applyGeneratedImageToFill(
  store: EditorStore,
  nodeId: string,
  fillIndex: number,
  previousHash: string | undefined,
  bytes: Uint8Array,
  label: string
): boolean {
  const node = store.graph.getNode(nodeId)
  const target = node?.fills.at(fillIndex)
  if (!node || fillIndex < 0 || target?.type !== 'IMAGE' || target.imageHash !== previousHash) {
    return false
  }
  const imageHash = store.storeImage(bytes)
  const fills = node.fills.map((fill, index) =>
    index === fillIndex ? withImage(fill, imageHash) : fill
  )
  // The result arrives after an await, so it never joins a batch another edit opened meanwhile.
  store.recordEdit({ label, ownStep: true }, () => store.updateNode(nodeId, { fills }))
  store.requestRender()
  return true
}

/** The middle of what the canvas shows, where generated layers are placed. */
function viewCenter(store: EditorStore): Vector {
  const screen = store.viewportCanvasCenter()
  return store.screenToCanvas(screen.x, screen.y)
}

/** Places a generated image as a new layer in the middle of the view, selected, as one step. */
export async function placeGeneratedImage(
  store: EditorStore,
  bytes: Uint8Array,
  name: string
): Promise<boolean> {
  const before = new Set(store.state.selectedIds)
  // The file name becomes the layer name, so it must not read as a path.
  const fileName = `${name.replace(/[\\/]/g, '-')}.png`
  const file = new File([bytes.slice()], fileName, { type: 'image/png' })
  const center = viewCenter(store)
  await store.placeFiles([file], center.x, center.y)
  return !sameSelection(before, store.state.selectedIds)
}

/**
 * Places generated SVG as editable layers in the middle of the view, through the same SVG import
 * as pasting markup and the `import_svg` tool, selected, as one step.
 */
export function placeGeneratedSVG(store: EditorStore, svg: string): Promise<boolean> {
  const center = viewCenter(store)
  return store.pasteSVG(svg, center.x, center.y)
}

function sameSelection(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((id) => b.has(id))
}
