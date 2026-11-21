import type { NodeType, SceneGraph, SceneNode } from '@pairdraw/scene-graph'

/**
 * Which layers of two frames Smart animate moves, and which it fades: pairs of a layer in the
 * start frame and its match in the destination, then the start frame's layers with no match and
 * the destination's, each the topmost of its unmatched branch, in layer order.
 */
export interface LayerMatch {
  pairs: { from: string; to: string }[]
  leaving: string[]
  entering: string[]
}

/** Layers that hold others; a frame matches an instance or a group of the same name. */
const CONTAINERS: ReadonlySet<NodeType> = new Set<NodeType>([
  'FRAME',
  'GROUP',
  'SECTION',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE'
])

/**
 * Whether two layers of the same name at the same place animate from one to the other. A layer
 * hidden in either frame, a layer of another kind, or text that reads differently crossfades
 * instead, as Figma dissolves what it cannot animate.
 */
function animates(from: SceneNode, to: SceneNode): boolean {
  if (!from.visible || !to.visible) return false
  if (from.type !== to.type && !(CONTAINERS.has(from.type) && CONTAINERS.has(to.type))) {
    return false
  }
  return from.type !== 'TEXT' || from.text === to.text
}

/**
 * A key per child that names its place among its siblings: its name, and how many siblings before
 * it share that name, so repeated names pair in the order they come.
 */
function siblingKeys(children: readonly SceneNode[]): string[] {
  const seen = new Map<string, number>()
  return children.map((child) => {
    const count = seen.get(child.name) ?? 0
    seen.set(child.name, count + 1)
    return `${count}:${child.name}`
  })
}

/**
 * Matches the layers of `fromRootId` to those of `toRootId` as Smart animate does: by name and by
 * place in the hierarchy, so a layer matches the layer of its name under its parent's match, and
 * the n-th of several siblings with one name matches the n-th there. One pass over both frames.
 */
export function matchLayers(
  from: SceneGraph,
  fromRootId: string,
  to: SceneGraph,
  toRootId: string
): LayerMatch {
  const match: LayerMatch = { pairs: [], leaving: [], entering: [] }
  const visit = (fromParentId: string, toParentId: string) => {
    const fromChildren = from.getChildren(fromParentId)
    const toChildren = to.getChildren(toParentId)
    const toKeys = siblingKeys(toChildren)
    const byKey = new Map(toKeys.map((key, index) => [key, toChildren[index]]))
    const taken = new Set<string>()
    const fromKeys = siblingKeys(fromChildren)
    fromChildren.forEach((child, index) => {
      const partner = byKey.get(fromKeys[index] ?? '')
      if (!partner || !animates(child, partner)) {
        match.leaving.push(child.id)
        return
      }
      taken.add(partner.id)
      match.pairs.push({ from: child.id, to: partner.id })
      visit(child.id, partner.id)
    })
    for (const child of toChildren) {
      if (!taken.has(child.id)) match.entering.push(child.id)
    }
  }
  visit(fromRootId, toRootId)
  return match
}
