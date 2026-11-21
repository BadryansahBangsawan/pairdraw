import type { BooleanOperation, MaskType, SceneNode } from '@pairdraw/scene-graph'

/**
 * The shape details a node summary reports, under Figma's plugin-API names: the per-corner radii
 * once the corners are drawn one by one and disagree, the mask flag and type while the layer masks,
 * and a boolean layer's operation. A plain layer carries none of them.
 *
 * The per-corner fields are live only while `independentCorners` is set; otherwise the shape renders
 * the uniform `cornerRadius` and any stored per-corner values are stale (a .fig import or a uniform
 * radius-handle write leaves them), so they stay out. While the corners disagree the proxy reads
 * `cornerRadius` as `mixed`, which JSON cannot hold, so the uniform field stays out too.
 */
export interface ShapeDetailFields {
  cornerRadius?: number
  topLeftRadius?: number
  topRightRadius?: number
  bottomRightRadius?: number
  bottomLeftRadius?: number
  isMask?: boolean
  maskType?: MaskType
  booleanOperation?: BooleanOperation
}

export function shapeDetailFields(node: SceneNode): ShapeDetailFields {
  const fields: ShapeDetailFields = {}
  const corners = [
    node.topLeftRadius,
    node.topRightRadius,
    node.bottomRightRadius,
    node.bottomLeftRadius
  ]
  const differ = node.independentCorners && corners.some((radius) => radius !== corners[0])
  // Figma reads independent corners that agree as one radius, so the reported radius must come from
  // that agreement rather than the stale uniform field the corner edits leave behind.
  const uniform = node.independentCorners ? corners[0] : node.cornerRadius
  if (differ) {
    fields.topLeftRadius = node.topLeftRadius
    fields.topRightRadius = node.topRightRadius
    fields.bottomRightRadius = node.bottomRightRadius
    fields.bottomLeftRadius = node.bottomLeftRadius
  } else if (uniform > 0) {
    fields.cornerRadius = uniform
  }
  if (node.isMask) {
    fields.isMask = true
    fields.maskType = node.maskType
  }
  if (node.booleanOperation) fields.booleanOperation = node.booleanOperation
  return fields
}
