import type { AttachModifiers, MovePlace, Tool } from '@pairdraw/core'
import type { HandlePosition, TransformZone } from '@pairdraw/core/geometry'
import type {
  DerivedTextGlyph,
  GeometryPath,
  NodeType,
  SceneNode,
  Stroke,
  TextPathData,
  VectorNetwork
} from '@pairdraw/scene-graph'
import type { Rect, Vector } from '@pairdraw/scene-graph/primitives'
import type { ResizeSnapshot } from '@pairdraw/scene-graph/resize'

import type { FlowDrag } from '#vue/shared/input/flow-reorder'
import type { LayerSizing } from '#vue/shared/input/resize/sizing'

export interface DragDraw {
  type: 'draw'
  /** Start point in the parent's axes. */
  startX: number
  startY: number
  /** Maps a canvas point into the parent's axes. */
  toLocal: (x: number, y: number) => Vector
  /** A line is drawn by its length and angle, as in Figma, not as a box. */
  line?: boolean
  /** Lands a coordinate on the pixel grid while Snap to pixel grid is on. */
  snap: (value: number) => number
  nodeId: string
  update: (changes: Partial<SceneNode>) => void
  commit: () => void
  cancel: () => void
}

/**
 * A connector drawn with the connector tool, from the press to the release or from one click to
 * the next. Positions are screen pixels, to tell a click from a drag.
 */
export interface DragConnectorDraw {
  type: 'connector-draw'
  startSX: number
  startSY: number
  moved: boolean
  /** Where the pointer is, in canvas coordinates. */
  x: number
  y: number
  /** The keys held at the last move, which the release attaches by. */
  modifiers: AttachModifiers
  commit: () => void
  cancel: () => void
}

/** An end of a selected connector dragged to another layer or point. */
interface DragConnectorEnd {
  type: 'connector-end'
  commit: () => void
  cancel: () => void
}

/** An elbow segment or the curve of a selected connector dragged into place. */
interface DragConnectorLine {
  type: 'connector-line'
  commit: () => void
  cancel: () => void
}

/** An end of a selected line or arrow dragged to aim it. */
interface DragLineEnd {
  type: 'line-end'
  commit: () => void
  cancel: () => void
}

/** A sticky note being drawn: it grows from the press corner with the drag, as a frame does. */
export interface DragStickyDraw {
  type: 'sticky-draw'
  /** Grows the note to the pointer, in canvas coordinates. */
  move: (cx: number, cy: number) => void
  commit: () => void
  cancel: () => void
}

/**
 * A sticky note's handle dragged: a corner, top, or bottom scales the whole note, a side switches
 * it between square and wide, as in FigJam.
 */
export interface DragStickyScale {
  type: 'sticky-scale'
  mode: 'scale' | 'wide'
  handle: HandlePosition
  startX: number
  startY: number
  nodeId: string
  origRect: Rect
  /** The note and its sublayers as the drag found them. */
  originals: Map<string, SceneNode>
  /** The scale and top-left the latest step reached. */
  scale: number
  position: Vector
  /** Whether a side drag has reached the wide width. */
  wide: boolean
  commit: () => void
  cancel: () => void
}

export interface DragMove {
  type: 'move'
  startX: number
  startY: number
  currentX: number
  currentY: number
  appliedDx: number
  appliedDy: number
  startScreenX: number
  startScreenY: number
  dragStarted: boolean
  originals: Map<string, MovePlace>
  duplicated?: boolean
  duplicatedPreviousSelection?: Set<string>
  autoLayoutParentId?: string
  brokeFromAutoLayout?: boolean
  /** The auto layout flows the moved layers are dragged along, as blocks. */
  flows?: FlowDrag[]
  /** Each flow's slot for the block where the drag has reached. */
  flowSlots?: number[]
  /** Space is held: layers keep their parents wherever they are dropped. */
  keepParents?: boolean
  /** Control is held: auto layout frames take the layers as absolute-positioned children. */
  ignoreAutoLayout?: boolean
  /** Selected instead if the press ends as a click without dragging. */
  selectOnClick?: string
  /** Where Control drops layers among an auto layout frame's children. */
  absoluteInsertIndex?: number
  /** A selected layer a Shift-press on it deselects when it ends without a drag. */
  clickDeselectsId?: string
}

export interface DragPan {
  type: 'pan'
  startScreenX: number
  startScreenY: number
  startPanX: number
  startPanY: number
}

export interface DragResize {
  type: 'resize'
  handle: HandlePosition
  startX: number
  startY: number
  origRect: Rect
  nodeId: string
  origVectorNetwork: VectorNetwork | null
  origFillGeometry: GeometryPath[]
  /** Path-text OUTSIDE outlines / vector stroke blobs — must scale with the node. */
  origStrokeGeometry: GeometryPath[]
  origDerivedTextGlyphs: DerivedTextGlyph[] | null
  origStrokes: Stroke[]
  origTextPathData: TextPathData | null
  origTextPathBox: Rect | null
  origChildren: Map<string, ResizeSnapshot> | null
  /** The ratio the layer is locked to, kept unless Control frees it. */
  lockedAspectRatio: number | null
  /** Whether the latest step set the lock aside, so the commit stores the new size. */
  freesLock?: boolean
  appliedRect?: Rect
  /** The layer's edited fields before the drag marked its size, to put back if it changes nothing. */
  origEditedFields?: string[]
  /** The layer's sizing before the drag, taken on its first step. */
  origSizing?: LayerSizing
  /** The sizing the latest step left, which the commit keeps. */
  appliedSizing?: LayerSizing
}

export interface DragMarquee {
  type: 'marquee'
  startX: number
  startY: number
  /** The open frame or section the marquee started in, whose layers it selects. */
  containerId?: string
  /** Selected instead if the press ends as a click without dragging. */
  selectOnClick?: string
}

export interface DragRotate {
  type: 'rotate'
  nodeId: string
  centerX: number
  centerY: number
  startAngle: number
  origRotation: number
  rotationDirection: 1 | -1
}

interface DragPen {
  type: 'pen-drag'
  startX: number
  startY: number
  modifierMode: 'default' | 'continuous' | 'independent'
  frozenOppositeTangent: Vector | null
  spaceDown: boolean
  spaceStartX: number
  spaceStartY: number
  knotStartX: number
  knotStartY: number
}

interface DragPencil {
  type: 'pencil-drag'
}

interface DragTextSelect {
  type: 'text-select'
  startX: number
  startY: number
}

export interface DragEditNode {
  type: 'edit-node'
  startX: number
  startY: number
  origPositions: Map<number, Vector>
  /**
   * A selected segment or region that was pressed: releasing without a drag selects only it, or
   * with Shift takes it out of the selection.
   */
  click?: { part: 'segment' | 'region'; index: number; deselect: boolean }
  /**
   * ⌥/Alt was held on the press: once the pointer moves past the drag threshold the selection is
   * copied and the copies drag instead; `false` once copied.
   */
  duplicate?: boolean
}

export interface DragEditHandle {
  type: 'edit-handle'
  segmentIndex: number
  tangentField: 'tangentStart' | 'tangentEnd'
  vertexIndex: number
  startX: number
  startY: number
  initialTangent: Vector | null
}

/** A drag over empty space while editing a path: selects the points and segments it encloses. */
export interface DragEditMarquee {
  type: 'edit-marquee'
  startX: number
  startY: number
  /** Points kept selected alongside the enclosed ones, as with Shift held. */
  baseSelection: Set<number>
  /** Segments kept selected alongside the enclosed ones, as with Shift held. */
  baseSegments: Set<number>
}

interface DragBendHandle {
  type: 'bend-handle'
  vertexIndex: number
  startX: number
  startY: number
  lockedMode: 'symmetric' | 'independent' | null
  dragSamples: Vector[]
  targetSegmentIndex: number | null
  targetTangentField: 'tangentStart' | 'tangentEnd' | null
}

/**
 * A ⌘/Ctrl drag on a segment of the path being edited: bends the segment so the pressed point on it
 * follows the pointer, or with ⌥/Alt too, without turning the handles of the segments beside it.
 */
export interface DragBendSegment {
  type: 'bend-segment'
  segmentIndex: number
  /** Where along the segment it was pressed, as a share of it. */
  t: number
  startX: number
  startY: number
  /** The path as the press found it; each move bends from it. */
  origin: VectorNetwork
}

/** A drag on the transform box around selected points: scales them from a handle or turns them. */
export interface DragEditTransform {
  type: 'edit-transform'
  zone: TransformZone
  /** The selected points, and the box around them as the press found it. */
  points: number[]
  box: Rect
  startX: number
  startY: number
  /** The path as the press found it; each move transforms from it. */
  origin: VectorNetwork
}

export interface DragGuide {
  type: 'guide'
  axis: 'x' | 'y'
  ownerId: string
  position: number
  startScreenX: number
  startScreenY: number
  currentScreenX: number
  currentScreenY: number
  dragStarted: boolean
  duplicate?: boolean
  guideId?: string
  originalOwnerId?: string
  originalPosition?: number
}

/** Dragging a handle or stop of the gradient whose picker is open. */
export interface DragGradient {
  type: 'gradient'
  /** Moves the dragged handle or stop to a screen point. */
  update: (screenX: number, screenY: number, shiftKey: boolean) => void
  commit: () => void
  cancel: () => void
}

/** Dragging a crop handle, an image corner, or the image itself in image edit mode. */
export interface DragImageCrop {
  type: 'image-crop'
  /** Applies the drag up to a screen point; Shift keeps proportions or an axis, Alt the centre. */
  update: (screenX: number, screenY: number, modifiers: { shift: boolean; alt: boolean }) => void
  commit: () => void
  cancel: () => void
}

/** A zoom tool press: a click zooms in or out on the pointer, a drag frames an area to zoom to. */
export interface DragZoom {
  type: 'zoom'
  /** Follows the pointer, in canvas and screen coordinates; ⌥ or Alt zooms out. */
  update: (cx: number, cy: number, sx: number, sy: number, altKey: boolean) => void
  commit: () => void
  cancel: () => void
}

/**
 * A Scale tool handle drag: the selection scales with its contents from the opposite handle, or
 * from its center while ⌥ or Alt is held.
 */
export interface DragScale {
  type: 'scale'
  /** The resize cursor the drag keeps. */
  cursor: string
  update: (cx: number, cy: number, sx: number, sy: number, altKey: boolean) => void
  commit: () => void
  cancel: () => void
}

/** Dragging a radius, point count, or ratio handle of the selected rectangle, polygon, or star. */
export interface DragShapeHandle {
  type: 'shape-handle'
  /** Sets the value under a screen point; Shift rounds a radius to tens. */
  update: (screenX: number, screenY: number, shiftKey: boolean) => void
  commit: () => void
  cancel: () => void
}

export type DragState =
  | DragShapeHandle
  | DragDraw
  | DragStickyDraw
  | DragConnectorDraw
  | DragConnectorEnd
  | DragConnectorLine
  | DragLineEnd
  | DragGradient
  | DragImageCrop
  | DragMove
  | DragPan
  | DragResize
  | DragStickyScale
  | DragZoom
  | DragScale
  | DragMarquee
  | DragRotate
  | DragPen
  | DragPencil
  | DragTextSelect
  | DragEditNode
  | DragEditHandle
  | DragEditMarquee
  | DragBendHandle
  | DragBendSegment
  | DragEditTransform
  | DragGuide

export const TOOL_TO_NODE: Partial<Record<Tool, NodeType>> = {
  FRAME: 'FRAME',
  SECTION: 'SECTION',
  RECTANGLE: 'RECTANGLE',
  ELLIPSE: 'ELLIPSE',
  LINE: 'LINE',
  POLYGON: 'POLYGON',
  STAR: 'STAR',
  TEXT: 'TEXT',
  SHAPE_WITH_TEXT: 'SHAPE_WITH_TEXT'
}
