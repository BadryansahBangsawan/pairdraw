import type { Path } from 'canvaskit-wasm'

import type { Vector } from '@open-pencil/scene-graph/primitives'

import type { SkiaRenderer } from '#core/canvas/renderer'

/** A path through `points` in order, closed back to the first when `close` is set. */
export function polyline(r: SkiaRenderer, points: readonly Vector[], close: boolean): Path {
  const path = new r.ck.PathBuilder()
  points.forEach((point, index) =>
    index === 0 ? path.moveTo(point.x, point.y) : path.lineTo(point.x, point.y)
  )
  if (close) path.close()
  return path.detachAndDelete()
}
