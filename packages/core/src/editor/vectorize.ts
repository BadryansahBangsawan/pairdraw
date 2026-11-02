import { restoreSubtree, snapshotSubtree } from '#core/editor/history/subtree'
import type { EditorContext } from '#core/editor/types'
import { createVectorFrameBeside, type SVGVectorizeResult } from '#core/vector/vectorize'

export function createVectorizeActions(ctx: EditorContext) {
  /**
   * Adds the vectors made from an image beside it, keeping the image, and selects them; one undo
   * step removes them again and selects what was selected before.
   */
  function addVectorFrameBeside(nodeId: string, vectorized: SVGVectorizeResult): string | null {
    const previousSelection = new Set(ctx.state.selectedIds)
    const frameId = createVectorFrameBeside(ctx.graph, nodeId, vectorized)
    const frame = frameId ? ctx.graph.getNode(frameId) : undefined
    const parentId = frame?.parentId
    const parent = parentId ? ctx.graph.getNode(parentId) : undefined
    if (!frame || !parentId || !parent) return null

    const index = parent.childIds.indexOf(frame.id)
    const frameSubtree = snapshotSubtree(ctx.graph, frame.id)
    ctx.setSelectedIds(new Set([frame.id]))

    // Vectors arrive after the service answers, so they never join a batch another edit opened.
    ctx.undo.pushStep({
      label: 'Vectorize image',
      forward: () => {
        const frameRoot = frameSubtree.get(frame.id)
        if (frameRoot && !ctx.graph.getNode(frame.id)) {
          restoreSubtree(ctx.graph, frameRoot, parentId, frameSubtree)
          ctx.graph.insertChildAt(frame.id, parentId, index)
        }
        ctx.setSelectedIds(new Set([frame.id]))
        ctx.requestRender()
      },
      inverse: () => {
        if (ctx.graph.getNode(frame.id)) ctx.graph.deleteNode(frame.id)
        ctx.setSelectedIds(previousSelection)
        ctx.requestRender()
      }
    })

    ctx.requestRender()
    return frame.id
  }

  return { addVectorFrameBeside }
}
