/**
 * Turn a script's drawn output into ordinary layers: the SCRIPT node goes and its children take
 * its place, all in one undo step, so undo puts the live script back exactly as it was.
 */
import type { EditorStore } from '@/app/editor/session'

/**
 * Replaces `nodeId` with the layers it drew. A script with no output leaves nothing behind, and a
 * node that is not a script is left alone.
 */
export function convertScriptToLayers(store: EditorStore, nodeId: string): string[] {
  const node = store.graph.getNode(nodeId)
  if (node?.type !== 'SCRIPT' || !node.parentId) return []
  const parentId = node.parentId
  const kept = [...node.childIds]

  store.recordEdit({ label: 'Convert to layers', ownStep: true }, () => {
    const index = store.graph.getNode(parentId)?.childIds.indexOf(nodeId) ?? 0
    kept.forEach((childId, offset) => {
      store.graph.reparentNode(childId, parentId)
      store.graph.insertChildAt(childId, parentId, index + offset)
    })
    store.graph.deleteNode(nodeId)
  })

  store.select(kept)
  return kept
}
