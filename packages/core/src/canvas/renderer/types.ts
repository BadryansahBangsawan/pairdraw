import type { SceneGraph, VectorRegion, VectorVertex } from '@pairdraw/scene-graph'
import type { Color, Rect, Vector } from '@pairdraw/scene-graph/primitives'
import type { SnapGuide } from '@pairdraw/scene-graph/snap'

import type { GuideOverlayState } from '#core/canvas/guides/types'
import type { DesignIssueHighlight } from '#core/canvas/issues/types'
import type { ConnectorTarget } from '#core/editor/connectors/attach'
import type { ShapeHandleHover, GradientEdit, ImageEdit, PencilState } from '#core/editor/types'
import type { RotationPreview } from '#core/geometry'
import type { TextEditor } from '#core/text/editor'

/** Selection chrome on the canvas and the text drawn on it, such as size pills and ruler badges. */
export interface SelectionTheme {
  color: Color
  foreground: Color
}

export interface RulerTheme {
  background: Color
  tick: Color
  text: Color
}

export type MeasurementMode = 'off' | 'shallow' | 'deep'

/** Where a collaborator or an agent is working, in world coordinates. */
export interface PresenceCursor {
  /** Who it is, kept between updates; editors use it to glide a cursor rather than jump it. */
  id?: string
  kind: 'person' | 'agent'
  name: string
  /** A person's color, or the color of the person who runs the agent. */
  color: Color
  x: number
  y: number
  selection?: string[]
  /** Outlines in world coordinates of what is not a layer yet, such as streamed JSX. */
  outline?: Rect[]
}

/**
 * A top-level frame a playing prototype changed, which the canvas draws from the frame's private
 * copy: the copy, a count that grows with each change, and the layers the changes touched, whose
 * cached drawings are stale. `@pairdraw/core/prototype`'s play scenes are these.
 */
export interface RenderedPlayScene {
  readonly graph: SceneGraph
  readonly revision: number
  readonly touched: ReadonlySet<string>
}

export interface RenderOverlays {
  /** Whether the canvas previews: it draws the design without labels or editing outlines. */
  playing?: boolean
  /** Top-level frames a playing prototype draws from its own copies instead of the document. */
  playScenes?: ReadonlyMap<string, RenderedPlayScene>
  /** How far a playing prototype scrolled each frame's content, by frame id. */
  playScroll?: ReadonlyMap<string, Vector>
  /** Layers a previewing canvas leaves to its live islands. */
  playIslands?: ReadonlySet<string>
  hoveredNodeId?: string | null
  /** Draw the pixel grid when zoomed in far enough. */
  showPixelGrid?: boolean
  /** The gradient whose handles to draw in place of the selection. */
  gradientEdit?: GradientEdit | null
  /** The image fill whose crop and framing to draw in place of the selection. */
  imageEdit?: ImageEdit | null
  transforming?: boolean
  measurementMode?: MeasurementMode
  editingTextId?: string | null
  /** The layer whose name a field over the canvas renames, whose title the canvas leaves out. */
  renamingLabelId?: string | null
  textEditor?: TextEditor | null
  marquee?: Rect | null
  snapGuides?: SnapGuide[]
  guides?: GuideOverlayState
  rotationPreview?: RotationPreview | null
  dropTargetId?: string | null
  layoutInsertIndicator?: {
    x: number
    y: number
    length: number
    direction: 'HORIZONTAL' | 'VERTICAL'
  } | null
  autoLayoutHover?: {
    nodeId: string
    kind: 'frame' | 'children' | 'spacing' | 'spacing-value' | 'padding' | 'padding-value'
    /** For a gap: whether it edits the flow's spacing or the wrapped lines' spacing. */
    axis?: 'primary' | 'counter'
    index?: number
    side?: 'top' | 'right' | 'bottom' | 'left'
  } | null
  /** The selected shape's handles and the label of the one in use. */
  shapeHandleHover?: ShapeHandleHover | null
  /** The layer a connector end would attach to, outlined with its magnets. */
  connectorTarget?: ConnectorTarget | null
  penState?: {
    vertices: Vector[]
    segments: Array<{
      start: number
      end: number
      tangentStart: Vector
      tangentEnd: Vector
    }>
    dragTangent: Vector | null
    oppositeDragTangent?: Vector | null
    closingToFirst: boolean
    pendingClose?: boolean
    cursorX?: number
    cursorY?: number
  } | null
  pencilState?: PencilState | null
  nodeEditState?: {
    nodeId: string
    vertices: VectorVertex[]
    segments: Array<{
      start: number
      end: number
      tangentStart: Vector
      tangentEnd: Vector
    }>
    regions: VectorRegion[]
    selectedVertexIndices: Set<number>
    selectedSegmentIndices?: Set<number>
    selectedHandles?: Set<number>
    hoveredHandleInfo?: { segmentIndex: number; tangentField: 'tangentStart' | 'tangentEnd' } | null
    /** The region under the pointer, hatched as in Figma. */
    hoveredRegion?: number | null
    /** Regions picked by clicking inside them, hatched while selected. */
    selectedRegions?: Set<number>
    /** While the cut tool is picked up there is no transform box. */
    cutTool?: boolean
    /** False while presses go to a tool other than Select, which has no transform box. */
    pointsTransformable?: boolean
    /** The corners of a transform box a drag is turning or scaling the selected points with. */
    transformBox?: Vector[] | null
  } | null
  presenceCursors?: PresenceCursor[]
  designIssueHighlight?: DesignIssueHighlight | null
  codeFocusNodeId?: string | null
}
