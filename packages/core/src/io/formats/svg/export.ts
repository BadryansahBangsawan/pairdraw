import type { RenderColorSpace } from '@pairdraw/scene-graph/color'

import { normalizeDashPattern } from '#core/canvas/strokes'
import { lineStrokePath } from '#core/canvas/strokes/line'
import { fittedDashPattern } from '#core/canvas/strokes/sides'
import { computeContentBounds } from '#core/io/formats/raster'

import {
  nextDefId,
  formatSolidColor,
  createFilterDef,
  resolveFill,
  solidFillOpacity,
  SVG_STROKE_CAP,
  SVG_STROKE_JOIN,
  SVG_BLEND_MODE
} from './defs'
import {
  round,
  geometryBlobToSVGPath,
  makePolygonPoints,
  roundedPolygonPath,
  hasRadius,
  hasSmoothCorners,
  boxOutlinePath,
  arcPath,
  shapeWithTextOutlinePath
} from './paths'

export { geometryBlobToSVGPath, nodeOutlinePath, type OutlineNode } from './paths'

import type { SceneGraph, SceneNode, Fill, Stroke, VectorNetwork } from '@pairdraw/scene-graph'
import { looseSegments, regionSVGPaths } from '@pairdraw/scene-graph/vector-network'

import { arrowHeadElements, openPathElements, vectorArrowHeads } from './arrows'
import type { SVGExportContext, SVGFontAlias } from './defs'
import { svg, renderSVGNode } from './node'
import type { SVGNode } from './node'
import { alignedStroke, alignedStrokeElement, shapeWithTextDetailElements } from './strokes'
import { renderTextNode } from './text/export'
import type { SVGTextLayout } from './text/lines'

// --- Node rendering ---

/**
 * A vector network's paths: its regions as they are traced, and its open segments as the canvas
 * strokes them, rounded and pulled back under their heads.
 */
function networkElements(
  node: SceneNode,
  network: VectorNetwork,
  common: Record<string, string | number | undefined>
): SVGNode[] {
  const regions = regionSVGPaths(network).map((d) => svg('path', { d, ...common }))
  if (looseSegments(network).length === 0) return regions
  return [...regions, ...openPathElements(node, network, common, looseSegments)]
}

/** Paints one path's fill stack; a blended fill draws its stroke as a separate path. */
function vectorFillElements(
  attrs: Record<string, string | number | undefined>,
  visibleFills: Fill[],
  strokeAttrs: Record<string, string | number | undefined>,
  common: Record<string, string | number | undefined>,
  node: SceneNode,
  ctx: SVGExportContext
): SVGNode[] {
  const elements: SVGNode[] = []
  for (const [index, fill] of visibleFills.entries()) {
    const fillAttr = resolveFill(fill, node, ctx)
    if (!fillAttr) continue
    const style = paintBlendStyle(fill)
    const last = index === visibleFills.length - 1
    const splitStroke = style !== undefined && last && common.stroke !== 'none'
    const stroke = last && !splitStroke ? common.stroke : 'none'
    elements.push(
      svg('path', {
        ...attrs,
        fill: fillAttr,
        'fill-opacity': solidFillOpacity(fill, ctx.colorSpace),
        style,
        stroke
      })
    )
    if (splitStroke) {
      elements.push(
        svg('path', {
          d: attrs.d,
          'fill-rule': attrs['fill-rule'],
          fill: 'none',
          ...strokeAttrs
        })
      )
    }
  }
  return elements
}

function vectorShapeElements(
  node: SceneNode,
  common: Record<string, string | number | undefined>,
  strokeAttrs: Record<string, string | number | undefined>,
  ctx: SVGExportContext,
  fallbackFills?: Fill[]
): SVGNode[] {
  const elements: SVGNode[] = []
  if (node.fillGeometry.length > 0) {
    for (const geo of node.fillGeometry) {
      const d = geometryBlobToSVGPath(geo.commandsBlob)
      if (!d) continue
      const attrs = {
        d,
        'fill-rule': geo.windingRule === 'EVENODD' ? 'evenodd' : undefined,
        ...common
      }
      const pathFills = geo.fills?.length ? geo.fills : fallbackFills
      if (!pathFills) {
        elements.push(svg('path', attrs))
        continue
      }
      const visibleFills = pathFills.filter((fill) => fill.visible)
      if (visibleFills.length === 0) {
        elements.push(svg('path', { ...attrs, fill: 'none' }))
        continue
      }
      elements.push(...vectorFillElements(attrs, visibleFills, strokeAttrs, common, node, ctx))
    }
  } else if (node.vectorNetwork) {
    elements.push(...networkElements(node, node.vectorNetwork, common))
  }
  elements.push(...vectorStrokeTail(node, strokeAttrs))
  return withVectorFallback(elements, node, common)
}

/** The empty vector's fallback shape, after both paints have contributed their elements. */
function withVectorFallback(
  elements: SVGNode[],
  node: SceneNode,
  common: Record<string, string | number | undefined>
): SVGNode[] {
  return elements.length > 0
    ? elements
    : [svg('rect', { width: round(node.width), height: round(node.height), ...common })]
}

/** The stored stroke geometry and arrowheads both vector paints share after their outlines. */
function vectorStrokeTail(
  node: SceneNode,
  strokeAttrs: Record<string, string | number | undefined>
): SVGNode[] {
  const elements: SVGNode[] = []
  if (node.strokeGeometry.length > 0 && strokeAttrs.stroke && strokeAttrs.stroke !== 'none') {
    for (const geo of node.strokeGeometry) {
      const d = geometryBlobToSVGPath(geo.commandsBlob)
      if (d) {
        elements.push(
          svg('path', {
            d,
            fill: strokeAttrs.stroke,
            'fill-opacity': strokeAttrs['stroke-opacity'],
            stroke: 'none'
          })
        )
      }
    }
  }
  if (node.vectorNetwork) elements.push(...vectorArrowHeads(node, node.vectorNetwork, strokeAttrs))
  return elements
}

/** A vector layer's outlines as strokes alone, for a second stroke over the painted fills. */
function vectorStrokeElements(
  node: SceneNode,
  strokeAttrs: Record<string, string | number | undefined>
): SVGNode[] {
  const elements: SVGNode[] = []
  const common: Record<string, string | number | undefined> = { fill: 'none', ...strokeAttrs }
  if (node.fillGeometry.length > 0) {
    for (const geo of node.fillGeometry) {
      const d = geometryBlobToSVGPath(geo.commandsBlob)
      if (d) {
        elements.push(
          svg('path', {
            d,
            'fill-rule': geo.windingRule === 'EVENODD' ? 'evenodd' : undefined,
            ...common
          })
        )
      }
    }
  } else if (node.vectorNetwork) {
    elements.push(...networkElements(node, node.vectorNetwork, common))
  }
  elements.push(...vectorStrokeTail(node, strokeAttrs))
  return withVectorFallback(elements, node, common)
}

/** A line's dashes stretched along it as the canvas lays them, half a dash at each end. */
function lineDashAttrs(stroke: Stroke | undefined, length: number) {
  const fitted = fittedDashPattern(length, normalizeDashPattern(stroke?.dashPattern))
  if (!fitted) return {}
  return {
    'stroke-dasharray': fitted.intervals.map((size) => round(size)).join(' '),
    'stroke-dashoffset': round(fitted.offset)
  }
}

function nodeShapeElements(
  node: SceneNode,
  fillAttr: string | null,
  fillOpacity: number | undefined,
  strokeAttrs: Record<string, string | number | undefined>,
  ctx: SVGExportContext,
  stroke?: Stroke
): SVGNode[] {
  const common: Record<string, string | number | undefined> = {
    fill: fillAttr ?? 'none',
    'fill-opacity': fillOpacity,
    ...strokeAttrs
  }

  switch (node.type) {
    case 'ELLIPSE': {
      if (node.arcData) {
        return [svg('path', { d: arcPath(node), ...common })]
      }
      return [
        svg('ellipse', {
          cx: round(node.width / 2),
          cy: round(node.height / 2),
          rx: round(node.width / 2),
          ry: round(node.height / 2),
          ...common
        })
      ]
    }

    case 'LINE': {
      // Where the canvas strokes it: to one side of the line, with its caps inside its length.
      const lineStroke = stroke ?? node.strokes.find((item) => item.visible)
      const {
        network,
        from: start,
        to: end
      } = lineStrokePath(node, lineStroke?.weight ?? 0, lineStroke?.cap ?? node.strokeCap)
      return [
        svg('line', {
          x1: round(start.x),
          y1: round(start.y),
          x2: round(end.x),
          y2: round(end.y),
          fill: 'none',
          ...strokeAttrs,
          ...lineDashAttrs(lineStroke, Math.hypot(end.x - start.x, end.y - start.y))
        }),
        ...arrowHeadElements(node, network, lineStroke, strokeAttrs)
      ]
    }

    case 'STAR':
    case 'POLYGON':
      return node.cornerRadius > 0
        ? [svg('path', { d: roundedPolygonPath(node), ...common })]
        : [svg('polygon', { points: makePolygonPoints(node), ...common })]

    case 'VECTOR':
      return vectorShapeElements(node, common, strokeAttrs, ctx)

    case 'SHAPE_WITH_TEXT':
      return shapeWithTextElements(node, common, strokeAttrs, ctx)

    default:
      return [boxOutlineElement(node, common)]
  }
}

/**
 * A box layer's outline as one element: a rect, a rect with `rx`/`ry` for one radius, or the
 * shared box path for independent or smoothed corners, so fills and clips follow the same edge.
 */
function boxOutlineElement(
  node: SceneNode,
  attrs: Record<string, string | number | undefined>
): SVGNode {
  const width = round(node.width)
  const height = round(node.height)
  if (!hasRadius(node)) return svg('rect', { width, height, ...attrs })
  if (node.independentCorners || hasSmoothCorners(node)) {
    return svg('path', { d: boxOutlinePath(node), ...attrs })
  }
  // SVG clamps rx and ry to their own sides; the canvas keeps a too-large radius circular.
  const radius = round(Math.min(node.cornerRadius, node.width / 2, node.height / 2))
  return svg('rect', { width, height, rx: radius, ry: radius, ...attrs })
}

/**
 * A FigJam shape's outline, and its inner lines, such as a database's front rim, stroked as the
 * canvas strokes them: at the stroke's own weight, ending where the outline does.
 */
function shapeWithTextElements(
  node: SceneNode,
  common: Record<string, string | number | undefined>,
  strokeAttrs: Record<string, string | number | undefined>,
  ctx: SVGExportContext
): SVGNode[] {
  return [
    svg('path', { d: shapeWithTextOutlinePath(node), ...common }),
    ...shapeWithTextDetailElements(node, strokeAttrs, ctx)
  ]
}

// --- Main recursive renderer ---

function buildTransformAttr(node: SceneNode): string | undefined {
  const transforms: string[] = []
  if (node.x !== 0 || node.y !== 0) transforms.push(`translate(${round(node.x)}, ${round(node.y)})`)
  if (node.rotation !== 0) {
    transforms.push(
      `rotate(${round(node.rotation)}, ${round(node.width / 2)}, ${round(node.height / 2)})`
    )
  }
  if (node.flipX || node.flipY) {
    const tx = node.flipX ? node.width : 0
    const ty = node.flipY ? node.height : 0
    const sx = node.flipX ? -1 : 1
    const sy = node.flipY ? -1 : 1
    transforms.push(`translate(${round(tx)}, ${round(ty)}) scale(${sx}, ${sy})`)
  }
  return transforms.length > 0 ? transforms.join(' ') : undefined
}

function buildGroupAttrs(
  node: SceneNode,
  ctx: SVGExportContext
): { attrs: Record<string, string | number | undefined>; clipId?: string } {
  const attrs: Record<string, string | number | undefined> = {}

  const transform = buildTransformAttr(node)
  if (transform) attrs.transform = transform

  if (node.opacity < 1) attrs.opacity = round(node.opacity)

  const blend = SVG_BLEND_MODE[node.blendMode]
  if (blend && blend !== 'normal' && node.blendMode !== 'PASS_THROUGH') {
    attrs.style = `mix-blend-mode: ${blend}`
  }

  const filterDef = createFilterDef(node.effects, ctx)
  if (filterDef) {
    ctx.defs.push(filterDef.node)
    attrs.filter = `url(#${filterDef.id})`
  }

  let clipId: string | undefined
  if (node.clipsContent && node.childIds.length > 0) {
    clipId = nextDefId(ctx, 'clip')
    ctx.defs.push(svg('clipPath', { id: clipId }, boxOutlineElement(node, {})))
  }

  return { attrs, clipId }
}

function buildSVGStrokeAttrs(
  stroke: Stroke,
  node: SceneNode,
  ctx: SVGExportContext
): Record<string, string | number | undefined> {
  const cap = stroke.cap ?? node.strokeCap
  const attrs: Record<string, string | number | undefined> = {
    // Opacity 1 keeps the color opaque. Display P3 must not also keep color alpha here, or a
    // viewer multiplies it by stroke-opacity; the canvas paints stroke.opacity alone.
    stroke:
      stroke.type === 'SOLID'
        ? formatSolidColor(stroke.color, 1, ctx.colorSpace)
        : (resolveFill(stroke, node, ctx) ?? formatSolidColor(stroke.color, 1, ctx.colorSpace)),
    'stroke-width': round(stroke.weight)
  }
  if (stroke.opacity < 1) attrs['stroke-opacity'] = round(stroke.opacity)
  if (cap !== 'NONE') attrs['stroke-linecap'] = SVG_STROKE_CAP[cap] ?? 'butt'
  if (stroke.join && stroke.join !== 'MITER') {
    attrs['stroke-linejoin'] = SVG_STROKE_JOIN[stroke.join] ?? 'miter'
  }
  if (stroke.dashPattern && stroke.dashPattern.length > 0) {
    attrs['stroke-dasharray'] = stroke.dashPattern.map((n) => round(n)).join(' ')
  }
  return attrs
}

/** The blend CSS a paint adds, when the canvas would not composite it source-over. */
function paintBlendStyle(fill: Fill | undefined): string | undefined {
  const blend = fill?.blendMode ? SVG_BLEND_MODE[fill.blendMode] : undefined
  return blend && blend !== 'normal' ? `mix-blend-mode: ${blend}` : undefined
}

/** Adds a paint's blend mode to the elements that draw it. */
function withPaintBlend(elements: SVGNode[], fill: Fill | undefined): SVGNode[] {
  const style = paintBlendStyle(fill)
  if (style) for (const element of elements) element.attrs.style = style
  return elements
}

/**
 * Draws the fill and the stroke as separate elements when the fill blends, so the stroke keeps the
 * source-over canvas gives it instead of inheriting the fill's blend mode.
 */
function shapeWithPaint(
  node: SceneNode,
  fillAttr: string | null,
  fillOpacity: number | undefined,
  strokeAttrs: Record<string, string | number | undefined>,
  fill: Fill | undefined,
  ctx: SVGExportContext
): SVGNode[] {
  const blends = paintBlendStyle(fill) !== undefined
  if (!blends || !strokeAttrs.stroke) {
    return withPaintBlend(nodeShapeElements(node, fillAttr, fillOpacity, strokeAttrs, ctx), fill)
  }
  return [
    ...withPaintBlend(nodeShapeElements(node, fillAttr, fillOpacity, {}, ctx), fill),
    ...nodeShapeElements(node, null, undefined, strokeAttrs, ctx)
  ]
}

function hasPathLevelFills(node: SceneNode): boolean {
  return node.type === 'VECTOR' && node.fillGeometry.some((geometry) => geometry.fills?.length)
}

/** One stroke at its own weight over the fills: a centred one on the outline, an aligned one around it. */
function strokeElements(
  node: SceneNode,
  stroke: Stroke,
  strokeAttrs: Record<string, string | number | undefined>,
  ctx: SVGExportContext
): SVGNode[] {
  const aligned = hasPathLevelFills(node) ? null : alignedStroke(node, stroke)
  if (aligned) {
    return [
      ...alignedStrokeElement(node, aligned, strokeAttrs, ctx),
      ...(node.type === 'SHAPE_WITH_TEXT'
        ? shapeWithTextDetailElements(node, strokeAttrs, ctx)
        : [])
    ]
  }
  if (node.type === 'VECTOR') return vectorStrokeElements(node, strokeAttrs)
  return nodeShapeElements(node, null, undefined, strokeAttrs, ctx, stroke)
}

/**
 * The fills and the strokes over them. The first stroke joins the fill's own element as before;
 * every later visible stroke is drawn in layer order, without painting the fill again.
 */
function buildShapeChildren(
  node: SceneNode,
  visibleFills: Fill[],
  fillAttr: string | null,
  fillOpacity: number | undefined,
  strokeAttrs: Record<string, string | number | undefined>[],
  visibleStrokes: Stroke[],
  ctx: SVGExportContext
): SVGNode[] {
  if (visibleStrokes.length === 0) {
    return fillAndStrokeElements(node, visibleFills, fillAttr, fillOpacity, {}, 0, ctx)
  }
  const first = visibleStrokes[0]
  const firstAttrs = strokeAttrs[0]
  const elements = alignedStroke(node, first)
    ? // The fill goes as it is, and the stroke over it inside or outside the outline.
      [
        ...fillAndStrokeElements(node, visibleFills, fillAttr, fillOpacity, {}, 0, ctx),
        ...strokeElements(node, first, firstAttrs, ctx)
      ]
    : fillAndStrokeElements(
        node,
        visibleFills,
        fillAttr,
        fillOpacity,
        firstAttrs,
        visibleStrokes.length,
        ctx
      )
  for (let index = 1; index < visibleStrokes.length; index++) {
    elements.push(...strokeElements(node, visibleStrokes[index], strokeAttrs[index], ctx))
  }
  return elements
}

function fillAndStrokeElements(
  node: SceneNode,
  visibleFills: Fill[],
  fillAttr: string | null,
  fillOpacity: number | undefined,
  strokeAttrs: Record<string, string | number | undefined>,
  visibleStrokeCount: number,
  ctx: SVGExportContext
): SVGNode[] {
  if (hasPathLevelFills(node)) {
    return vectorShapeElements(
      node,
      { fill: fillAttr ?? 'none', 'fill-opacity': fillOpacity, ...strokeAttrs },
      strokeAttrs,
      ctx,
      visibleFills
    )
  }

  if (visibleFills.length > 1) {
    const elements: SVGNode[] = []
    for (const fill of visibleFills) {
      const ref = resolveFill(fill, node, ctx)
      if (ref) {
        elements.push(
          ...shapeWithPaint(
            node,
            ref,
            solidFillOpacity(fill, ctx.colorSpace),
            fill === visibleFills[visibleFills.length - 1] ? strokeAttrs : {},
            fill,
            ctx
          )
        )
      }
    }
    return elements
  }

  const hasFillOrStroke = fillAttr || visibleStrokeCount > 0
  if (hasFillOrStroke && !isGroupLike(node)) {
    return shapeWithPaint(
      node,
      fillAttr,
      fillOpacity,
      strokeAttrs,
      visibleFills.length === 1 ? visibleFills[0] : undefined,
      ctx
    )
  }

  return []
}

/** The paint CSS `color` sets, for a tinted icon path. */
const CURRENT_COLOR = 'currentColor'

/** A paint's SVG color and, for an sRGB solid, the `fill-opacity` beside it. */
function exportedFill(
  fill: Fill | undefined,
  node: SceneNode,
  ctx: SVGExportContext
): { color: string | null; opacity: number | undefined } {
  if (!fill) return { color: null, opacity: undefined }
  return {
    color: resolveFill(fill, node, ctx),
    opacity: solidFillOpacity(fill, ctx.colorSpace)
  }
}

/**
 * A mask layer's definition: an alpha or luminance `<mask>`, or a `<clipPath>` for an outline
 * mask. The rendered layer carries its own position, opacity, and filters into the mask.
 */
function maskWire(
  mask: SceneNode,
  ctx: SVGExportContext
): { attribute: 'mask' | 'clip-path'; id: string } {
  const content = renderNode(mask, ctx)
  if (mask.maskType === 'VECTOR') {
    const id = nextDefId(ctx, 'clip')
    ctx.defs.push(svg('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, content ?? undefined))
    return { attribute: 'clip-path', id }
  }
  const id = nextDefId(ctx, 'mask')
  const attrs: Record<string, string | number | undefined> = {
    id,
    maskContentUnits: 'userSpaceOnUse'
  }
  if (mask.maskType === 'ALPHA') attrs['mask-type'] = 'alpha'
  ctx.defs.push(svg('mask', attrs, content ?? undefined))
  return { attribute: 'mask', id }
}

/**
 * The children as the canvas draws them: a run of visible masks masks the siblings that follow
 * it, until the next mask, and the mask layers themselves never draw on their own.
 */
function maskedChildNodes(childNodes: SceneNode[], ctx: SVGExportContext): SVGNode[] {
  const content: SVGNode[] = []
  let masks: Array<{ attribute: 'mask' | 'clip-path'; id: string }> = []
  let afterMask = false
  for (const child of childNodes) {
    if (child.visible && child.isMask) {
      const wire = maskWire(child, ctx)
      masks = afterMask ? [...masks, wire] : [wire]
      afterMask = true
      continue
    }
    const rendered = renderNode(child, ctx)
    afterMask = false
    if (!rendered) continue
    let wrapped = rendered
    for (const wire of masks) wrapped = svg('g', { [wire.attribute]: `url(#${wire.id})` }, wrapped)
    content.push(wrapped)
  }
  return content
}

function renderNode(node: SceneNode, ctx: SVGExportContext): SVGNode | null {
  if (!node.visible) return null

  const { attrs: groupAttrs, clipId } = buildGroupAttrs(node, ctx)

  if (node.type === 'TEXT') {
    const fill = exportedFill(
      node.fills.find((f) => f.visible),
      node,
      ctx
    )
    return svg('g', groupAttrs, renderTextNode(node, fill.color, ctx, fill.opacity))
  }

  const visibleFills = node.fills.filter((f) => f.visible)
  const visibleStrokes = node.strokes.filter((s) => s.visible)
  const tint = ctx.tint?.(node) ?? []
  const ownFill = visibleFills.length > 0 && !hasPathLevelFills(node) ? visibleFills[0] : undefined
  const fill = exportedFill(ownFill, node, ctx)
  const tintedFill = fill.color !== null && tint.includes('fill')
  const fillAttr = tintedFill ? CURRENT_COLOR : fill.color
  // `currentColor` has no alpha. Display P3 normally bakes solid opacity into the color, which a
  // tint throws away, so a tinted solid keeps `fill-opacity` in every color space.
  const fillOpacity = ownFill ? solidFillOpacity(ownFill, ctx.colorSpace, tintedFill) : fill.opacity
  const strokeAttrs = visibleStrokes.map((stroke) => {
    const attrs = buildSVGStrokeAttrs(stroke, node, ctx)
    return tint.includes('stroke') ? { ...attrs, stroke: CURRENT_COLOR } : attrs
  })

  const children: (SVGNode | null)[] = buildShapeChildren(
    node,
    visibleFills,
    fillAttr,
    fillOpacity,
    strokeAttrs,
    visibleStrokes,
    ctx
  )

  const childContent = maskedChildNodes(ctx.graph.getChildren(node.id), ctx)

  if (clipId && childContent.length > 0) {
    children.push(svg('g', { 'clip-path': `url(#${clipId})` }, ...childContent))
  } else {
    children.push(...childContent)
  }

  const validChildren = children.filter((c): c is SVGNode => c !== null)

  if (validChildren.length === 0 && Object.keys(groupAttrs).length === 0) {
    return null
  }

  if (validChildren.length === 1 && Object.keys(groupAttrs).length === 0) {
    return validChildren[0]
  }

  return svg('g', groupAttrs, ...validChildren)
}

function isGroupLike(node: SceneNode): boolean {
  return node.type === 'GROUP'
}

// --- Public API ---

export interface SVGExportOptions {
  /** Include XML declaration (default: true) */
  xmlDeclaration?: boolean
  /** Target export color space (default: srgb) */
  colorSpace?: 'srgb' | 'display-p3'
  /**
   * Line breaks of text nodes as the editor laid them out, wraps included. Without them, only
   * explicit newlines start a new baseline, which renderers that do not wrap SVG text keep.
   */
  textLayout?: SVGTextLayout
  /**
   * A family to name a font face by instead of its own, such as the one a PDF embeds the face's
   * file under. Text in an aliased face is written in that family at normal weight and style.
   */
  fontAlias?: SVGFontAlias
}

export function renderNodesToSVG(
  graph: SceneGraph,
  _pageId: string,
  nodeIds: string[],
  options: SVGExportOptions = {}
): string | null {
  const bounds = computeContentBounds(graph, nodeIds)
  if (!bounds) return null

  const { minX, minY, maxX, maxY } = bounds
  const width = round(maxX - minX)
  const height = round(maxY - minY)

  const ctx: SVGExportContext = {
    defs: [],
    defIdCounter: 0,
    graph,
    colorSpace: options.colorSpace ?? 'srgb',
    textLayout: options.textLayout,
    fontAlias: options.fontAlias
  }

  const contentNodes: SVGNode[] = []

  for (const id of nodeIds) {
    const node = graph.getNode(id)
    if (!node?.visible) continue

    const abs = graph.getAbsolutePosition(id)
    const offsetX = abs.x - minX
    const offsetY = abs.y - minY

    const needsOffset = offsetX !== node.x || offsetY !== node.y
    const clone = needsOffset ? { ...node, x: round(offsetX), y: round(offsetY) } : node

    const rendered = renderNode(clone, ctx)
    if (rendered) contentNodes.push(rendered)
  }

  if (contentNodes.length === 0) return null

  const rootChildren: (SVGNode | string)[] = []
  if (ctx.defs.length > 0) {
    rootChildren.push(svg('defs', {}, ...ctx.defs))
  }
  rootChildren.push(...contentNodes)

  const root = svg(
    'svg',
    {
      xmlns: 'http://www.w3.org/2000/svg',
      'xmlns:xlink': 'http://www.w3.org/1999/xlink',
      width,
      height,
      viewBox: `0 0 ${width} ${height}`
    },
    ...(rootChildren as SVGNode[])
  )

  const svgStr = renderSVGNode(root)
  const xmlDecl = options.xmlDeclaration !== false ? '<?xml version="1.0" encoding="UTF-8"?>\n' : ''
  return xmlDecl + svgStr
}

/**
 * One layer as an `<svg>` element sized to its box, for inlining in HTML where the box already
 * places, rotates, and fades it: the drawing starts at the layer's origin without its rotation
 * or opacity, and keeps its flips.
 */
export function renderNodeSVGElement(
  graph: SceneGraph,
  node: SceneNode,
  {
    idPrefix,
    colorSpace = 'srgb',
    tint
  }: Pick<SVGExportContext, 'tint'> & { idPrefix: string; colorSpace?: RenderColorSpace }
): SVGNode | null {
  const ctx: SVGExportContext = { defs: [], defIdCounter: 0, graph, colorSpace, idPrefix, tint }
  const drawn = renderNode({ ...node, x: 0, y: 0, rotation: 0, opacity: 1 }, ctx)
  if (!drawn) return null
  // A straight line has no height or width, but its stroke still needs a viewport to draw in.
  const width = Math.max(1, round(node.width))
  const height = Math.max(1, round(node.height))
  return svg(
    'svg',
    { width, height, viewBox: `0 0 ${width} ${height}` },
    ctx.defs.length > 0 ? svg('defs', {}, ...ctx.defs) : null,
    drawn
  )
}
