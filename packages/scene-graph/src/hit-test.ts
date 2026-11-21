import { hitsConnectorLine } from './connectors/hit'
import { getAxisAlignedBoundsAt, getNodeLocalMatrix, getWorldMatrix } from './coordinate'
import type { SceneGraph } from './graph'
import { containsPoint } from './hit-test/geometry'
import { clippingMasks, isMaskedOut } from './hit-test/masks'
import { showsPaint } from './hit-test/paint'
import { drawnChildIds } from './layout/draw-order'
import Matrix, { type Mat3 } from './matrix'
import type { Rect } from './primitives'
import type { SceneNode, NodeType } from './types'

export { clippingMasks, isPointMaskedOut } from './hit-test/masks'
export { hitTestDropTarget, type DropTargetOptions } from './hit-test/drop'
export { showsPaint } from './hit-test/paint'

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
 * Whether a container's empty area takes the click. Figma counts it only where a paint shows,
 * except a main component's, which always counts, and an instance's when the click is a plain one.
 */
function takesEmptyArea(graph: SceneGraph, node: SceneNode, instanceBodies: boolean): boolean {
  if (node.type === 'COMPONENT' || showsPaint(node) || ownsItsEmptyArea(graph, node)) return true
  return instanceBodies && node.type === 'INSTANCE'
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

/**
 * What a click inside a container reports. `opaque` is an instance or component whose body takes
 * the click without looking through it; every other container looks through to its children first.
 */
function hitTestContainer(
  graph: SceneGraph,
  px: number,
  py: number,
  child: SceneNode,
  childId: string,
  deep: boolean,
  transformCache: Map<string, boolean>,
  pad: number,
  locked = false,
  instanceBodies = false,
  opaque = false
): SceneNode | null {
  if (opaque) {
    if (!containsPoint(px, py, child, graph, transformCache)) return null
    const childHit = hitTestChildren(
      graph,
      px,
      py,
      childId,
      deep,
      transformCache,
      pad,
      locked,
      instanceBodies
    )
    if (childHit) return child
    if (takesEmptyArea(graph, child, instanceBodies)) return child
    return null
  }
  if (child.type === 'GROUP') {
    // A group fits its layers, so a padded click on one at its edge falls just outside it.
    if (!containsPoint(px, py, child, graph, transformCache, pad)) return null
    const childHit = hitTestChildren(
      graph,
      px,
      py,
      childId,
      deep,
      transformCache,
      pad,
      locked,
      instanceBodies
    )
    if (childHit) return standIn(child, childHit, deep)
    return containsPoint(px, py, child, graph, transformCache) ? child : null
  }

  const childHit = hitTestChildren(
    graph,
    px,
    py,
    childId,
    deep,
    transformCache,
    pad,
    locked,
    instanceBodies
  )
  if (childHit) return standIn(child, childHit, true)

  if (
    containsPoint(px, py, child, graph, transformCache) &&
    takesEmptyArea(graph, child, instanceBodies)
  )
    return child
  return null
}
/**
 * What a hit inside a container reports: the container itself when it is locked (a locked layer,
 * where one is hit at all, stands in for everything inside it) or the walk stops at containers.
 */
function standIn(container: SceneNode, hit: SceneNode, deep: boolean): SceneNode {
  return container.locked || !deep ? container : hit
}

/**
 * The topmost layer under the point among a container's children. `pad`, in canvas units, grows
 * each leaf layer's box, as Figma takes a click a few screen pixels outside a shape.
 */
/**
 * Whether a layer under the point can take the click. A locked layer and everything in it are
 * invisible to a press and to hover, as in Figma: a click falls through to what lies under it, and
 * a drag from it draws a marquee.
 */
function takesClick(
  graph: SceneGraph,
  px: number,
  py: number,
  child: SceneNode | undefined,
  mask: readonly SceneNode[] | undefined,
  locked: boolean,
  transformCache: Map<string, boolean>
): child is SceneNode {
  if (!child || child.internalOnly || !child.visible || (child.locked && !locked)) return false
  return !isMaskedOut(px, py, mask, graph, transformCache)
}

function hitTestChildren(
  graph: SceneGraph,
  px: number,
  py: number,
  parentId: string,
  deep = false,
  transformCache = new Map<string, boolean>(),
  pad = 0,
  locked = false,
  instanceBodies = false
): SceneNode | null {
  const parent = graph.nodes.get(parentId)
  if (!parent) return null

  if (parent.clipsContent) {
    if (!containsPoint(px, py, parent, graph, transformCache)) return null
  }

  // Front to back, as the layers are drawn: a reversed auto layout puts the first child on top.
  const drawn = drawnChildIds(parent)
  const masks = clippingMasks(graph, drawn)
  for (let i = drawn.length - 1; i >= 0; i--) {
    const childId = drawn[i]
    const child = graph.nodes.get(childId)
    if (!takesClick(graph, px, py, child, masks[i], locked, transformCache)) continue
    if (CONTAINER_TYPES.has(child.type)) {
      if (OPAQUE_CONTAINER_TYPES.has(child.type) && !deep) {
        const hit = hitTestContainer(
          graph,
          px,
          py,
          child,
          childId,
          deep,
          transformCache,
          pad,
          locked,
          instanceBodies,
          true
        )
        if (hit) return hit
        continue
      }

      const hit = hitTestContainer(
        graph,
        px,
        py,
        child,
        childId,
        deep,
        transformCache,
        pad,
        locked,
        instanceBodies
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
  return hitTestChildren(graph, px, py, scope, false, new Map(), 0, false, true)
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
  py: number,
  locked = false
): SceneNode | null {
  const transformCache = new Map<string, boolean>()
  for (let i = container.childIds.length - 1; i >= 0; i--) {
    const child = graph.nodes.get(container.childIds[i])
    if (!child || child.internalOnly || !child.visible || child.type !== 'FRAME') continue
    if (child.locked && !locked) continue
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
  pad = 0,
  /** Whether locked layers are hit, as a right-click hits them; see `hitTestAtPoint`. */
  locked = false
): SceneNode | null {
  const deepest = hitTestChildren(graph, px, py, scopeId, true, new Map(), pad, locked, true)
  if (!deepest) {
    const scope = graph.nodes.get(scopeId)
    return scope ? frameChildAt(graph, scope, px, py, locked) : null
  }

  const chain: SceneNode[] = []
  for (let node: SceneNode | undefined = deepest; node && node.id !== scopeId;) {
    chain.unshift(node)
    node = node.parentId ? graph.nodes.get(node.parentId) : undefined
  }

  const opened = openedBySelection(graph, selectedIds, scopeId)

  for (const node of chain) {
    // A locked layer, hit only with `locked`, stands in for everything inside it.
    if (node.locked) return node
    if (!opened.has(node.id) && !opensByItself(graph, node)) return node
  }
  const last = chain.at(-1)
  if (!last) return null
  const frame = frameChildAt(graph, last, px, py, locked)
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
  const deepest = hitTestChildren(graph, px, py, scopeId, true, new Map(), 0, false, false)
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
  return showsPaint(node) && !opensByItself(graph, node)
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
