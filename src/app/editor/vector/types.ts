import type { EditorState } from '@pairdraw/core'
import type {
  VectorNetwork,
  VectorRegion,
  VectorSegment,
  VectorVertex
} from '@pairdraw/scene-graph'
import type { Rect, Vector } from '@pairdraw/scene-graph/primitives'

export type NodeEditState = {
  nodeId: string
  origNetwork: VectorNetwork
  origBounds: Rect
  /** Session geometry as entered (page-absolute) — commit is a no-op when unchanged */
  origAbsNetwork: VectorNetwork
  vertices: VectorVertex[]
  segments: VectorSegment[]
  regions: VectorRegion[]
  /** Session-local undo/redo stacks of geometry snapshots (Cmd+Z inside edit mode) */
  history: VectorNetwork[]
  future: VectorNetwork[]
  /** Geometry at the last undo/redo restore; divergence invalidates `future` */
  futureBaseline?: VectorNetwork | null
  selectedVertexIndices: Set<number>
  /** Segments selected as segments, apart from their endpoints, as in Figma */
  selectedSegmentIndices: Set<number>
  draggedHandleInfo: {
    vertexIndex: number
    handleType: 'tangentStart' | 'tangentEnd'
    segmentIndex: number
  } | null
  selectedHandles: Set<number>
  hoveredHandleInfo: {
    segmentIndex: number
    tangentField: 'tangentStart' | 'tangentEnd'
  } | null
  /** The region under the pointer, hatched as in Figma. */
  hoveredRegion: number | null
  /** Regions picked by clicking inside them; their points are selected with them. */
  selectedRegions: Set<number>
  /** Whether the cut tool (X) is picked up: a click cuts the path instead of selecting. */
  cutTool: boolean
  /**
   * The four corners of the transform box while a drag scales or turns the selected points, so the
   * box turns with them; `null` otherwise, when it fits the selected points.
   */
  transformBox: Vector[] | null
}

export type VectorEditState = EditorState & { nodeEditState: NodeEditState | null }

export type HandleInfo = {
  segmentIndex: number
  tangentField: 'tangentStart' | 'tangentEnd'
  neighborIndex: number
}
