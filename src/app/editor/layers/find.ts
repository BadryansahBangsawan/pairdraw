import type { SceneNode } from '@pairdraw/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'

/** How many layers Find layers lists from one page; a page with more is searched up to here. */
export const FIND_LAYERS_LIMIT = 2000

/** A layer Find layers can go to, with the names of the layers it sits in, outermost first. */
export interface FoundLayer {
  node: SceneNode
  ancestors: string[]
}

/**
 * The layers of the page `store` shows, in the order the layers panel lists them, parents before
 * their children. Reads the scene version, so a computed value that calls it follows the page.
 */
export function findableLayers(store: EditorStore, limit = FIND_LAYERS_LIMIT): FoundLayer[] {
  void store.state.sceneVersion
  const page = store.graph.getNode(store.state.currentPageId)
  if (!page) return []
  const found: FoundLayer[] = []
  // The panel lists the front layer first, which is the last child.
  const pending = page.childIds.map((id) => ({ id, ancestors: [] as string[] }))
  while (found.length < limit) {
    const next = pending.pop()
    if (!next) break
    const node = store.graph.getNode(next.id)
    if (!node) continue
    found.push({ node, ancestors: next.ancestors })
    const ancestors = [...next.ancestors, node.name]
    for (const id of node.childIds) pending.push({ id, ancestors })
  }
  return found
}

/** Opens Find layers for `store`'s document. */
export function openFindLayers(store: EditorStore): void {
  store.state.findLayersOpen = true
}

/** Selects a found layer and brings it into view. */
export function goToLayer(store: EditorStore, nodeId: string): void {
  if (!store.graph.getNode(nodeId)) return
  store.select([nodeId])
  store.revealNodes([nodeId])
}
