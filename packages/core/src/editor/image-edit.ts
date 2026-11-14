import type {
  Fill,
  GradientTransform,
  NodeType,
  SceneGraph,
  SceneNode
} from '@pairdraw/scene-graph'
import { getNodeLocalMatrix } from '@pairdraw/scene-graph/coordinate'
import { coverImageTransform, imageSize } from '@pairdraw/scene-graph/images'
import Matrix from '@pairdraw/scene-graph/matrix'
import type { Size, Vector } from '@pairdraw/scene-graph/primitives'

import { makeImageFillLocalMatrix } from '#core/canvas/fills'
import {
  coveringImageBounds,
  createSceneGeometry,
  croppedImageTransform,
  imageCropLayout,
  imageTransformFromLocalMatrix,
  pannedImageTransform,
  resizedCropRect,
  scaledImageTransform,
  type ImageCropHit,
  type ImageCropLayout,
  type RotationPreview,
  type ViewportTransform
} from '#core/geometry'

import { getNodeEditCapability } from './capabilities'
import type { EditorContext, ImageEdit } from './types'
import { resolveEditorProfile } from './views'

/** Layers whose image fills are reframed on the canvas; text and lines draw no image area. */
const IMAGE_EDIT_EXCLUDED: ReadonlySet<NodeType> = new Set([
  'CANVAS',
  'TEXT',
  'LINE',
  'GROUP',
  'SECTION',
  'COMPONENT_SET',
  'CONNECTOR',
  'STICKY'
])

/**
 * Layers whose edges crop: shapes drawn from their size alone. Vectors keep their paths and
 * layers with children their children's places, which moving their edges would change.
 */
const CROPPABLE: ReadonlySet<NodeType> = new Set([
  'RECTANGLE',
  'ROUNDED_RECTANGLE',
  'ELLIPSE',
  'STAR',
  'POLYGON',
  'FRAME'
])

const imageSizes = new WeakMap<Uint8Array, Size | null>()

function storedImageSize(graph: SceneGraph, hash: string): Size | null {
  const bytes = graph.images.get(hash)
  if (!bytes) return null
  let size = imageSizes.get(bytes)
  if (size === undefined) {
    size = imageSize(bytes)
    imageSizes.set(bytes, size)
  }
  return size && size.width > 0 && size.height > 0 ? size : null
}

function editableImageFill(fill: Fill | undefined): boolean {
  return fill?.visible === true && fill.type === 'IMAGE' && Boolean(fill.imageHash)
}

/**
 * The fill an image edit works on: `index` when that fill is a visible image, else the topmost
 * visible image fill without an index; −1 when there is none.
 */
export function editableImageFillIndex(node: SceneNode, index?: number): number {
  if (IMAGE_EDIT_EXCLUDED.has(node.type)) return -1
  if (index !== undefined) return editableImageFill(node.fills[index]) ? index : -1
  return node.fills.findLastIndex(editableImageFill)
}

/**
 * Whether cropping may move the layer's edges, rather than only reframe its image. Auto layout
 * sets the place, and may set the size, of a layer it lays out and of an auto layout frame's own
 * size, so those undo a crop's new edges and would move or stretch the image.
 */
export function imageEditCrops(graph: SceneGraph, node: SceneNode): boolean {
  if (!CROPPABLE.has(node.type) || node.childIds.length > 0 || node.layoutMode !== 'NONE')
    return false
  const parent = node.parentId ? graph.getNode(node.parentId) : undefined
  const laidOut = parent !== undefined && parent.layoutMode !== 'NONE'
  return !laidOut || node.layoutPositioning === 'ABSOLUTE'
}

/**
 * The crop that draws `fill` as it is drawn now: its own for a crop, else the Fill framing with
 * its turn, which a new crop starts from, as in Figma.
 */
export function imageCropTransform(fill: Fill, node: SceneNode, image: Size): GradientTransform {
  if (fill.imageScaleMode === 'CROP' && fill.imageTransform) return fill.imageTransform
  const local = makeImageFillLocalMatrix(
    { ...fill, imageScaleMode: 'FILL' },
    node,
    image.width,
    image.height
  )
  return (
    imageTransformFromLocalMatrix(local, node.width, node.height, image.width, image.height) ??
    coverImageTransform(node.width, node.height, image.width, image.height)
  )
}

export interface EditedImage {
  node: SceneNode
  fill: Fill
  index: number
  image: Size
  /** The crop the fill draws with, whether it is stored as a crop yet or not. */
  transform: GradientTransform
  croppable: boolean
}

/** The image fill being edited and its layer, while both still exist. */
export function editedImage(
  graph: SceneGraph,
  edit: ImageEdit | null | undefined
): EditedImage | null {
  if (!edit) return null
  const node = graph.getNode(edit.nodeId)
  const fill = node?.fills[edit.index]
  if (!node || fill?.type !== 'IMAGE' || !fill.imageHash) return null
  if (node.width <= 0 || node.height <= 0) return null
  const image = storedImageSize(graph, fill.imageHash)
  if (!image) return null
  return {
    node,
    fill,
    index: edit.index,
    image,
    transform: imageCropTransform(fill, node, image),
    croppable: imageEditCrops(graph, node)
  }
}

/** Where the edited image and its layer sit on screen, for drawing and hit testing alike. */
export function editedImageLayout(
  graph: SceneGraph,
  edit: ImageEdit | null | undefined,
  viewport: ViewportTransform,
  preview?: RotationPreview | null
): ImageCropLayout | null {
  const edited = editedImage(graph, edit)
  if (!edited) return null
  const geometry = createSceneGeometry(graph, preview)
  const { node } = edited
  return imageCropLayout(edited.transform, node.width, node.height, edited.croppable, (local) =>
    geometry.toScreen(node, local, viewport)
  )
}

function fillsWith(edited: EditedImage, transform: GradientTransform): Fill[] {
  return edited.node.fills.map((fill, index) =>
    index === edited.index
      ? { ...fill, imageScaleMode: 'CROP', imageTransform: { ...transform } }
      : fill
  )
}

export interface ImageEditModifiers {
  /** Shift: keep proportions while cropping, or move along one axis. */
  shift?: boolean
  /** Alt: crop or scale about the centre. */
  alt?: boolean
}

/**
 * The layer's changes after dragging `hit` from `from` to `to`, both in the layer's pixels as the
 * drag found it. Cropping moves and resizes the layer over a still image; reframing moves or
 * scales the image behind a still layer. Either way the fill is stored as a crop.
 */
export function imageEditChanges(
  edited: EditedImage,
  hit: ImageCropHit,
  from: Vector,
  to: Vector,
  modifiers: ImageEditModifiers = {}
): Partial<SceneNode> {
  const { node, transform } = edited
  const { width, height } = node
  if (hit.kind === 'pan') {
    let dx = to.x - from.x
    let dy = to.y - from.y
    if (modifiers.shift) {
      if (Math.abs(dx) >= Math.abs(dy)) dy = 0
      else dx = 0
    }
    return {
      fills: fillsWith(edited, pannedImageTransform(transform, width, height, { x: dx, y: dy }))
    }
  }
  if (hit.kind === 'scale') {
    const scaled = scaledImageTransform(transform, width, height, hit.corner, to, {
      fromCenter: modifiers.alt
    })
    return { fills: fillsWith(edited, scaled) }
  }
  if (!edited.croppable) return {}
  const rect = resizedCropRect(hit.handle, width, height, to, {
    keepRatio: modifiers.shift,
    fromCenter: modifiers.alt,
    limit: coveringImageBounds(transform, width, height)
  })
  // The layer's new top-left corner lands where that point of the old layer was.
  const corner = Matrix.mapPoint(getNodeLocalMatrix(node), { x: rect.x, y: rect.y })
  const offset = Matrix.mapPoint(
    getNodeLocalMatrix({ ...node, width: rect.width, height: rect.height }, { x: 0, y: 0 }),
    { x: 0, y: 0 }
  )
  return {
    x: corner.x - offset.x,
    y: corner.y - offset.y,
    width: rect.width,
    height: rect.height,
    fills: fillsWith(edited, croppedImageTransform(transform, width, height, rect))
  }
}

/**
 * Whether `node` has an image fill, the one at `index` when given, that the canvas can crop and
 * reframe: unlocked and outside a read-only library definition, as text editing requires.
 */
export function hasEditableImage(
  graph: SceneGraph,
  node: SceneNode | undefined,
  index?: number
): node is SceneNode {
  if (!node || node.locked || !getNodeEditCapability(graph, node.id).editable) return false
  return editableImageFillIndex(node, index) >= 0
}

/**
 * Image edit mode, as Figma's crop: the layer's image shows whole, the part outside the layer
 * faded; its edges crop and the image moves and scales behind it. Selecting something else,
 * switching tool or page, or replacing the document leaves it.
 */
export function createImageEditActions(
  ctx: EditorContext,
  updateNodeWithUndo: (id: string, changes: Partial<SceneNode>, label?: string) => void
) {
  function endImageEdit() {
    if (!ctx.state.imageEdit) return
    ctx.state.imageEdit = null
    ctx.requestRepaint()
  }

  /**
   * Whether the layer `nodeId` can enter image edit mode, on its fill at `index` when given and
   * otherwise on its topmost visible image fill.
   */
  function canEditImageOf(nodeId: string, index?: number): boolean {
    return (
      resolveEditorProfile(ctx.state).edits &&
      hasEditableImage(ctx.graph, ctx.graph.getNode(nodeId), index)
    )
  }

  /**
   * Enters image edit mode on `nodeId`, the single selected layer when omitted, selecting it; on
   * the fill at `index`, or the topmost visible image fill when omitted.
   * Fit and Tile frame the image unlike a crop, so they turn into the crop that covers the layer,
   * as Fill frames it, in one undo step; Fill draws just as its crop, which the first change stores.
   */
  function startImageEdit(nodeId?: string, fillIndex?: number): boolean {
    const id = nodeId ?? (ctx.state.selectedIds.size === 1 ? [...ctx.state.selectedIds][0] : null)
    const node = id ? ctx.graph.getNode(id) : undefined
    if (!node || !canEditImageOf(node.id, fillIndex)) return false
    const index = editableImageFillIndex(node, fillIndex)
    // An image whose bytes are not here yet has no size to frame by.
    const edited = editedImage(ctx.graph, { nodeId: node.id, index })
    if (!edited) return false
    if (ctx.state.activeTool !== 'SELECT') ctx.setActiveTool('SELECT')
    if (ctx.state.selectedIds.size !== 1 || !ctx.state.selectedIds.has(node.id))
      ctx.setSelectedIds(new Set([node.id]))
    ctx.state.gradientEdit = null
    const mode = edited.fill.imageScaleMode ?? 'FILL'
    if (mode === 'FIT' || mode === 'TILE')
      updateNodeWithUndo(node.id, { fills: fillsWith(edited, edited.transform) }, 'Crop image')
    ctx.state.imageEdit = { nodeId: node.id, index }
    ctx.requestRepaint()
    return true
  }

  ctx.onEditorEvent('selection:changed', (ids) => {
    const edit = ctx.state.imageEdit
    if (edit && (ids.length !== 1 || ids[0] !== edit.nodeId)) endImageEdit()
  })
  ctx.onEditorEvent('tool:changed', (tool) => {
    if (tool !== 'SELECT') endImageEdit()
  })
  ctx.onEditorEvent('page:changed', endImageEdit)
  ctx.onEditorEvent('graph:replaced', endImageEdit)
  // Locking the layer, removing its image, or undoing a Fit or Tile image's turn into a crop
  // leaves the mode: its handles would edit a layer that may not change, or frame the image
  // other than it draws.
  ctx.onEditorEvent('node:updated', (id) => {
    const edit = ctx.state.imageEdit
    if (!edit || id !== edit.nodeId) return
    const mode = ctx.graph.getNode(id)?.fills[edit.index]?.imageScaleMode
    if (!canEditImageOf(id, edit.index) || mode === 'FIT' || mode === 'TILE') endImageEdit()
  })
  ctx.onEditorEvent('node:deleted', (id) => {
    if (id === ctx.state.imageEdit?.nodeId) endImageEdit()
  })

  return { canEditImage: canEditImageOf, startImageEdit, endImageEdit }
}
