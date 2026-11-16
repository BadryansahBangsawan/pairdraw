import type { Vector } from '@pairdraw/scene-graph/primitives'

/** A straight segment between two points. */
export interface LineSegment {
  from: Vector
  to: Vector
}

export interface RotationPreview {
  nodeId: string
  angle: number
}

export interface ViewportTransform {
  panX: number
  panY: number
  zoom: number
}
