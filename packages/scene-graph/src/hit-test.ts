import { hitsConnectorLine } from './connectors/hit'
import { getAxisAlignedBoundsAt, getNodeLocalMatrix, getWorldMatrix } from './coordinate'
import { geometryBlobPolylines } from './geometry'
import type { SceneGraph } from './graph'
import Matrix, { type Mat3 } from './matrix'
import type { Rect, Vector } from './primitives'
import type { SceneNode, NodeType } from './types'

const CONTAINER_TYPES = new Set<NodeType>([
  'CANVAS',
  'FRAME',
  'GROUP',
  'SECTION',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE'
])
const OPAQUE_CONTAINER_TYPES = new Set<NodeType>(['COMPONENT', 'INSTANCE'])
/**
 * How far from a zero-width or zero-height layer, in canvas units, a point still lands on it, so
 * a flat line or an empty box stays clickable; matches a connector line's slop (`connectors/hit.ts`).
 */
const DEGENERATE_AXIS_SLOP = 4

function hasVisibleFillOrStroke(node: SceneNode): boolean {
  return node.fills.some((f) => f.visible) || node.strokes.some((s) => s.visible)
}

function isTopLevel(graph: SceneGraph, node: SceneNode): boolean {
  const parent = node.parentId ? graph.nodes.get(node.parentId) : undefined
  return parent?.type === 'CANVAS' || parent?.type === 'SECTION'
}

/**
 * An open container whose empty area still belongs to it, as in Figma: a top-level frame with auto
 * layout is selected, hovered, and dragged by its gaps and padding, while its children stay one
 * click away, with or without a fill. A plain top-level frame's empty area is background, and a
 * nested frame's empty area belongs to it only as a click target (see `frameChildAt`).
 */
function ownsItsEmptyArea(graph: SceneGraph, node: SceneNode): boolean {
  return node.type === 'FRAME' && node.layoutMode !== 'NONE' && isTopLevel(graph, node)
}

function hasTransformedAncestor(
  node: SceneNode,
  graph: SceneGraph,
  cache: Map<string, boolean>
): boolean {
  const cached = cache.get(node.id)
  if (cached !== undefined) return cached
  const parent = node.parentId ? graph.getNode(node.parentId) : undefined
  const transformed =
    node.rotation !== 0 ||
    node.flipX ||
    node.flipY ||
    (parent ? hasTransformedAncestor(parent, graph, cache) : false)
  cache.set(node.id, transformed)
  return transformed
}

/**
 * Where the point lies in the node's own coordinates: its offset from the position when nothing
 * above it is turned, else through the inverse world matrix. Null when that cannot be inverted.
 */
function localPoint(
  px: number,
  py: number,
  node: SceneNode,
  graph: SceneGraph,
  transformCache: Map<string, boolean>
): Vector | null {
  if (!hasTransformedAncestor(node, graph, transformCache)) {
    const absolute = graph.getAbsolutePosition(node.id)
    return { x: px - absolute.x, y: py - absolute.y }
  }
  const inv = Matrix.invert(getWorldMatrix(node, graph))
  if (!inv) return null
  const [x, y] = Matrix.mapPoints(inv, [px, py])
  return { x, y }
}

/** Whether the point lies in the node's box, grown by `pad` canvas units on every side. */
function containsPoint(
  px: number,
  py: number,
  node: SceneNode,
  graph: SceneGraph,
  transformCache: Map<string, boolean>,
  pad = 0
): boolean {
  const local = localPoint(px, py, node, graph, transformCache)
  if (!local) return false
  const padX = node.width > 0 ? pad : Math.max(pad, DEGENERATE_AXIS_SLOP)
  const padY = node.height > 0 ? pad : Math.max(pad, DEGENERATE_AXIS_SLOP)
  return (
    local.x >= -padX &&
    local.x <= node.width + padX &&
    local.y >= -padY &&
    local.y <= node.height + padY
  )
}

/** Whether a rounded rectangle of `width` × `height` holds the point. */
function roundedRectContains(
  point: Vector,
  width: number,
  height: number,
  radius: number
): boolean {
  if (point.x < 0 || point.y < 0 || point.x > width || point.y > height) return false
  const r = Math.max(0, Math.min(radius, width / 2, height / 2))
  const cx = Math.min(Math.max(point.x, r), width - r)
  const cy = Math.min(Math.max(point.y, r), height - r)
  return Math.hypot(point.x - cx, point.y - cy) <= r
}

/** Whether the point is inside a closed polyline, by the even-odd rule. */
function insidePolyline(polyline: readonly Vector[], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = polyline.length - 1; i < polyline.length; j = i++) {
    const a = polyline[i]
    const b = polyline[j]
    if (a.y > y === b.y > y) continue
    if (x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

/**
 * Whether a mask lets the point through, by the outline it draws: an ellipse's curve, a rounded
 * rectangle's corners, or a vector's filled path. Other shapes clip by their box.
 */
function maskContainsPoint(
  px: number,
  py: number,
  mask: SceneNode,
  graph: SceneGraph,
  transformCache: Map<string, boolean>
): boolean {
  const outlined =
    (mask.type === 'ELLIPSE' && mask.width > 0 && mask.height > 0) ||
    (mask.type === 'RECTANGLE' && mask.cornerRadius > 0) ||
    (mask.type === 'VECTOR' && mask.fillGeometry.length > 0)
  if (!outlined) return containsPoint(px, py, mask, graph, transformCache)
  const local = localPoint(px, py, mask, graph, transformCache)
  if (!local) return false
  if (mask.type === 'ELLIPSE') {
    const rx = mask.width / 2
    const ry = mask.height / 2
    const dx = (local.x - rx) / rx
    const dy = (local.y - ry) / ry
    return dx * dx + dy * dy <= 1
  }
  if (mask.type === 'RECTANGLE') {
    return roundedRectContains(local, mask.width, mask.height, mask.cornerRadius)
  }
  return geometryBlobPolylines(mask.fillGeometry).some((points) =>
    insidePolyline(points, local.x, local.y)
  )
}

function isVisibleMask(node: SceneNode | undefined): node is SceneNode {
  return node !== undefined && node.visible && node.isMask
}

/**
 * The masks that clip each child, by index, as the renderer groups them (`core/canvas/masks.ts`):
 * a run of visible masks clips the layers after it up to the next visible mask. Empty when the
 * container has no visible mask.
 */
function clippingMasks(graph: SceneGraph, childIds: readonly string[]): SceneNode[][] {
  const children = childIds.map((childId) => graph.nodes.get(childId))
  if (!children.some(isVisibleMask)) return []
  const result: SceneNode[][] = []
  let run: SceneNode[] = []
  let previousWasMask = false
  for (const child of children) {
    if (isVisibleMask(child)) {
      run = previousWasMask ? [...run, child] : [child]
      previousWasMask = true
      result.push([])
      continue
    }
    previousWasMask = false
    result.push(run)
  }
  return result
}

function hitTestOpaqueContainer(
  graph: SceneGraph,
  px: number,
  py: number,
  child: SceneNode,
  childId: string,
  deep: boolean,
  transformCache: Map<string, boolean>,
  pad: number
): SceneNode | null {
  if (!containsPoint(px, py, child, graph, transformCache)) return null
  const childHit = hitTestChildren(graph, px, py, childId, deep, transformCache, pad)
  if (childHit) return child
  if (hasVisibleFillOrStroke(child)) return child
  return null
}
function hitTestTransparentContainer(
  graph: SceneGraph,
  px: number,
  py: number,
  child: SceneNode,
  childId: string,
  deep: boolean,
  transformCache: Map<string, boolean>,
  pad: number
): SceneNode | null {
  if (child.type === 'GROUP') {
    // A group fits its layers, so a padded click on one at its edge falls just outside it.
    if (!containsPoint(px, py, child, graph, transformCache, pad)) return null
    const childHit = hitTestChildren(graph, px, py, childId, deep, transformCache, pad)
    if (childHit) return deep ? childHit : child
    return containsPoint(px, py, child, graph, transformCache) ? child : null
  }

  const childHit = hitTestChildren(graph, px, py, childId, deep, transformCache, pad)
  if (childHit) {
    if (child.locked) return child
    return childHit
  }

  if (
    containsPoint(px, py, child, graph, transformCache) &&
    (hasVisibleFillOrStroke(child) || ownsItsEmptyArea(graph, child))
  )
    return child
  return null
}

/** Whether the masks that clip a layer leave the point outside every one of their outlines. */
function isMaskedOut(
  px: number,
  py: number,
  masks: readonly SceneNode[] | undefined,
  graph: SceneGraph,
  transformCache: Map<string, boolean>
): boolean {
  if (!masks) return false
  return (
    masks.length > 0 &&
    !masks.some((mask) => maskContainsPoint(px, py, mask, graph, transformCache))
  )
}

/**
 * The topmost layer under the point among a container's children. `pad`, in canvas units, grows
 * each leaf layer's box, as Figma takes a click a few screen pixels outside a shape.
 */
function hitTestChildren(
  graph: SceneGraph,
  px: number,
  py: number,
  parentId: string,
  deep = false,
  transformCache = new Map<string, boolean>(),
  pad = 0
): SceneNode | null {
  const parent = graph.nodes.get(parentId)
  if (!parent) return null

  if (parent.clipsContent) {
    if (!containsPoint(px, py, parent, graph, transformCache)) return null
  }

  const masks = clippingMasks(graph, parent.childIds)
  for (let i = parent.childIds.length - 1; i >= 0; i--) {
    const childId = parent.childIds[i]
    const child = graph.nodes.get(childId)
    if (!child || child.internalOnly || !child.visible) continue
    if (isMaskedOut(px, py, masks[i], graph, transformCache)) continue
    if (CONTAINER_TYPES.has(child.type)) {
      if (OPAQUE_CONTAINER_TYPES.has(child.type) && !deep) {
        const hit = hitTestOpaqueContainer(graph, px, py, child, childId, deep, transformCache, pad)
        if (hit) return hit
        continue
      }

      const hit = hitTestTransparentContainer(
        graph,
        px,
        py,
        child,
        childId,
        deep,
        transformCache,
        pad
      )
      if (hit) return hit
      continue
    }

    if (child.type === 'CONNECTOR') {
      if (hitsConnectorLine(graph, child, px, py, pad)) return child
      continue
    }
    if (containsPoint(px, py, child, graph, transformCache, pad)) return child
  }

  return null
}

export function hitTest(
  graph: SceneGraph,
  px: number,
  py: number,
  scopeId?: string
): SceneNode | null {
  const scope = scopeId ?? graph.rootId
  return hitTestChildren(graph, px, py, scope, false)
}

export function hitTestDeep(
  graph: SceneGraph,
  px: number,
  py: number,
  scopeId?: string,
  pad = 0
): SceneNode | null {
  const scope = scopeId ?? graph.rootId
  return hitTestChildren(graph, px, py, scope, true, new Map(), pad)
}

/**
 * A container a click looks into by itself, as in Figma: a top-level frame (on the page or in a
 * section) or a section that holds layers, and a component set.
 */
function opensByItself(graph: SceneGraph, node: SceneNode): boolean {
  if (node.type === 'COMPONENT_SET') return true
  if (node.childIds.length === 0) return false
  if (node.type === 'SECTION') return true
  return node.type === 'FRAME' && isTopLevel(graph, node)
}

/**
 * The topmost frame among a container's children whose bounds hold the point, filled or not: in
 * Figma a click on the empty area of a frame inside an open container, or of an empty frame on the
 * page or in a section, selects that frame, while a deep (⌘) click looks through it.
 */
function frameChildAt(
  graph: SceneGraph,
  container: SceneNode,
  px: number,
  py: number
): SceneNode | null {
  const transformCache = new Map<string, boolean>()
  for (let i = container.childIds.length - 1; i >= 0; i--) {
    const child = graph.nodes.get(container.childIds[i])
    if (!child || child.internalOnly || !child.visible || child.type !== 'FRAME') continue
    // A board, such as a top-level frame in a section, keeps its empty area as background.
    if (opensByItself(graph, child) && !ownsItsEmptyArea(graph, child)) continue
    if (containsPoint(px, py, child, graph, transformCache)) return child
  }
  return null
}

/**
 * The containers the selection opens: every ancestor of a selected layer inside the scope, and a
 * selected container itself, so a click inside it selects the layer under the point, as in Figma.
 * A selected group or boolean stays closed: clicking inside it keeps it selected.
 */
function openedBySelection(
  graph: SceneGraph,
  selectedIds: ReadonlySet<string>,
  scopeId: string
): Set<string> {
  const ancestors = new Set<string>()
  for (const id of selectedIds) {
    const node = graph.nodes.get(id)
    if (
      node &&
      node.childIds.length > 0 &&
      node.type !== 'GROUP' &&
      node.type !== 'BOOLEAN_OPERATION'
    )
      ancestors.add(id)
    let parentId = node?.parentId
    while (parentId && parentId !== scopeId && !ancestors.has(parentId)) {
      ancestors.add(parentId)
      parentId = graph.nodes.get(parentId)?.parentId
    }
  }
  return ancestors
}

/**
 * The layer a click selects, as in Figma. It walks from the scope down to the deepest layer under
 * the point and stops at the first layer that is not open. Top-level frames and sections with
 * layers and component sets are open, and so is every ancestor of the selection, so clicks reach
 * the siblings of selected layers. Where every layer under the point is open, a container opened
 * by the selection is selected, so is a top-level frame with auto layout, and a plain top-level
 * frame or a section is not.
 */
export function hitTestSelectable(
  graph: SceneGraph,
  px: number,
  py: number,
  scopeId: string,
  selectedIds: ReadonlySet<string>,
  pad = 0
): SceneNode | null {
  const deepest = hitTestChildren(graph, px, py, scopeId, true, new Map(), pad)
  if (!deepest) {
    const scope = graph.nodes.get(scopeId)
    return scope ? frameChildAt(graph, scope, px, py) : null
  }

  const chain: SceneNode[] = []
  for (let node: SceneNode | undefined = deepest; node && node.id !== scopeId;) {
    chain.unshift(node)
    node = node.parentId ? graph.nodes.get(node.parentId) : undefined
  }

  const opened = openedBySelection(graph, selectedIds, scopeId)

  for (const node of chain) {
    // A locked layer stands in for everything inside it.
    if (node.locked) return node
    if (!opened.has(node.id) && !opensByItself(graph, node)) return node
  }
  const last = chain.at(-1)
  if (!last) return null
  const frame = frameChildAt(graph, last, px, py)
  if (frame) return frame
  if (ownsItsEmptyArea(graph, last)) return last
  return opened.has(last.id) && !opensByItself(graph, last) ? last : null
}

/** Whether a click looks into this container rather than selecting it; see `hitTestSelectable`. */
export function isOpenContainer(graph: SceneGraph, nodeId: string): boolean {
  const node = graph.nodes.get(nodeId)
  return node !== undefined && opensByItself(graph, node)
}

/**
 * The innermost open container under the point when every layer there is open: a marquee starting
 * here selects that container's layers, as in Figma.
 */
export function hitTestOpenContainer(
  graph: SceneGraph,
  px: number,
  py: number,
  scopeId: string
): SceneNode | null {
  const deepest = hitTestChildren(graph, px, py, scopeId, true)
  for (let node: SceneNode | undefined = deepest ?? undefined; node && node.id !== scopeId;) {
    if (!opensByItself(graph, node) || ownsItsEmptyArea(graph, node)) return null
    node = node.parentId ? graph.nodes.get(node.parentId) : undefined
  }
  return deepest
}

function rectsTouch(a: Rect, b: Rect): boolean {
  return a.x + a.width > b.x && a.x < b.x + b.width && a.y + a.height > b.y && a.y < b.y + b.height
}

function rectOverlap(a: Rect, b: Rect): Rect | null {
  if (!rectsTouch(a, b)) return null
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  return {
    x,
    y,
    width: Math.min(a.x + a.width, b.x + b.width) - x,
    height: Math.min(a.y + a.height, b.y + b.height) - y
  }
}

/**
 * Whether a deep marquee touching a container, but none of its layers, selects it: where a deep
 * click there would select it (a group's box, a painted container, the empty area a top-level frame
 * with auto layout owns), except a board or section whose empty area a press treats as background.
 */
function selectsByOwnArea(graph: SceneGraph, node: SceneNode): boolean {
  if (node.type === 'GROUP' || ownsItsEmptyArea(graph, node)) return true
  return hasVisibleFillOrStroke(node) && !opensByItself(graph, node)
}

/**
 * Collects the deepest layers among `parent`'s children that touch `rect`. Each child's world
 * matrix is composed from its parent's, so a walk over a large page climbs no ancestor chains.
 */
function collectDeepestInRect(
  graph: SceneGraph,
  parent: SceneNode,
  parentWorld: Mat3,
  rect: Rect,
  hits: SceneNode[]
) {
  // A clipping container draws nothing outside itself, so its layers meet only that part of the rect.
  const area =
    parent.clipsContent && parent.type !== 'CANVAS'
      ? rectOverlap(rect, getAxisAlignedBoundsAt(parent, parentWorld))
      : rect
  if (!area) return
  for (const childId of parent.childIds) {
    const child = graph.nodes.get(childId)
    if (!child || child.internalOnly || !child.visible || child.locked) continue
    const world = Matrix.multiply(parentWorld, getNodeLocalMatrix(child))
    const touches = rectsTouch(area, getAxisAlignedBoundsAt(child, world))
    if (!CONTAINER_TYPES.has(child.type) || child.childIds.length === 0) {
      if (touches) hits.push(child)
      continue
    }
    const before = hits.length
    collectDeepestInRect(graph, child, world, area, hits)
    if (hits.length === before && touches && selectsByOwnArea(graph, child)) hits.push(child)
  }
}

/**
 * The deepest layers a deep (⌘) marquee over `rect` selects, as in Figma, by the rules a deep click
 * follows: it looks into frames, groups, sections, components, component sets, and instances, keeps
 * a boolean's operands inside it, and skips hidden, locked, and internal layers with their contents.
 * A container is selected itself only where the rect touches its own area and none of its layers.
 * Layers are compared by their axis-aligned canvas bounds, as a plain marquee compares them.
 */
export function hitTestDeepInRect(graph: SceneGraph, rect: Rect, scopeId: string): SceneNode[] {
  const scope = graph.nodes.get(scopeId)
  if (!scope) return []
  const hits: SceneNode[] = []
  collectDeepestInRect(graph, scope, getWorldMatrix(scope, graph), rect, hits)
  return hits
}

/** Whether the point lies inside the node's rotated and flipped bounds. */
export function isPointInNode(graph: SceneGraph, nodeId: string, px: number, py: number): boolean {
  const node = graph.nodes.get(nodeId)
  return node !== undefined && containsPoint(px, py, node, graph, new Map())
}

/** Which layers take a drop, and which are only looked through, as in Figma. */
interface DropRules {
  takes: (node: SceneNode) => boolean
  passThrough: ReadonlySet<NodeType>
}

const LAYER_TARGETS = new Set<NodeType>(['FRAME', 'SECTION', 'COMPONENT', 'INSTANCE'])
const COMPONENT_TARGETS = new Set<NodeType>(['FRAME', 'SECTION', 'INSTANCE'])

function dropRules(options: DropTargetOptions): DropRules {
  const { componentSetIds } = options
  if (!componentSetIds) {
    return {
      takes: (node) => LAYER_TARGETS.has(node.type),
      passThrough: new Set(['GROUP', 'COMPONENT_SET'])
    }
  }
  // Components never go into other components, and a set only takes back its own variants.
  return {
    takes: (node) =>
      COMPONENT_TARGETS.has(node.type) ||
      (node.type === 'COMPONENT_SET' && componentSetIds.has(node.id)),
    passThrough: new Set(['GROUP'])
  }
}

function dropTargetIn(
  graph: SceneGraph,
  px: number,
  py: number,
  parent: SceneNode,
  excludeIds: ReadonlySet<string>,
  rules: DropRules,
  transformCache: Map<string, boolean>
): SceneNode | null {
  // A clipped-away part of a child is not under the cursor.
  if (
    parent.type !== 'CANVAS' &&
    parent.clipsContent &&
    !containsPoint(px, py, parent, graph, transformCache)
  )
    return null

  for (let i = parent.childIds.length - 1; i >= 0; i--) {
    const childId = parent.childIds[i]
    if (excludeIds.has(childId)) continue
    const child = graph.nodes.get(childId)
    if (!child || child.internalOnly || !child.visible || child.locked) continue
    const target = rules.takes(child)
    if (!target && !rules.passThrough.has(child.type)) continue

    const deeper = dropTargetIn(graph, px, py, child, excludeIds, rules, transformCache)
    if (deeper) return deeper
    if (target && containsPoint(px, py, child, graph, transformCache)) return child
  }

  return null
}

export interface DropTargetOptions {
  /**
   * Set when the dropped layers are all main components: the component sets they come from.
   * Components then go only into frames, sections, instances, and those sets.
   */
  componentSetIds?: ReadonlySet<string>
}

/**
 * The topmost unlocked frame, section, component, or instance under the point, in its rotated
 * shape and inside its clipping ancestors. Groups and component sets are looked through but never
 * returned, except that a set takes dropped components; locked layers and their contents are
 * skipped.
 */
export function hitTestDropTarget(
  graph: SceneGraph,
  px: number,
  py: number,
  excludeIds: ReadonlySet<string>,
  scopeId?: string,
  options: DropTargetOptions = {}
): SceneNode | null {
  const scope = graph.nodes.get(scopeId ?? graph.rootId)
  if (!scope) return null
  return dropTargetIn(graph, px, py, scope, excludeIds, dropRules(options), new Map())
}
