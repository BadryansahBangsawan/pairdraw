import { isEqual, pick, uniq } from 'es-toolkit'

import type { SceneNode } from '@pairdraw/scene-graph'

import { assertNodeEditable } from './capabilities'
import { restoreSources, type SourceSnapshots } from './history/sources'
import type { EditorContext } from './types'

export interface NodePreview {
  readonly closed: boolean
  update: (id: string, changes: Partial<SceneNode>) => void
  commit: () => void
  cancel: () => void
}

/** One owned numeric/property edit, including every node changed by its layout. */
export function createNodePreviewActions(
  ctx: EditorContext,
  updateNode: (id: string, changes: Partial<SceneNode>) => void
) {
  let current: NodePreview | null = null

  function cancelNodePreviews() {
    current?.cancel()
  }

  function beginNodePreview(label = 'Update'): NodePreview {
    cancelNodePreviews()
    const graph = ctx.graph
    const originals = new Map<string, Partial<SceneNode>>()
    const targets = new Set<string>()
    const layoutOnly = new Set<string>()
    const sourcesBefore: SourceSnapshots = new Map()
    let closed = false
    let endInteraction: (() => void) | undefined
    const subscriptions: Array<() => void> = []

    function capture(node: SceneNode, changes: Partial<SceneNode>) {
      if (!originals.has(node.id) && graph.isApplyingLayout) layoutOnly.add(node.id)
      if (!graph.isApplyingLayout) {
        layoutOnly.delete(node.id)
        markEdited(node, changes)
      }
      const previous = originals.get(node.id) ?? {}
      const keys = (Object.keys(changes) as (keyof SceneNode)[]).filter(
        (key) => !Object.hasOwn(previous, key)
      )
      if (keys.length) Object.assign(previous, structuredClone(pick(node, keys)))
      originals.set(node.id, previous)
    }

    // Fields count as edited while previewed, as a committed edit marks them, so the preview's
    // own layout stops keeping geometry a file saved; cancel takes the marks back.
    function markEdited(node: SceneNode, changes: Partial<SceneNode>) {
      if (graph.isPreservingSourceMetadata) return
      if (!sourcesBefore.has(node.id)) sourcesBefore.set(node.id, structuredClone(node.source))
      node.source.editedFields = uniq([...node.source.editedFields, ...Object.keys(changes)])
    }

    function close() {
      closed = true
      for (const stop of subscriptions) stop()
      endInteraction?.()
      if (current === preview) current = null
    }

    const preview: NodePreview = {
      get closed() {
        return closed
      },
      update(id, changes) {
        if (closed || graph !== ctx.graph || !graph.getNode(id)) return
        targets.add(id)
        endInteraction ??= ctx.beginInteractiveEdit()
        try {
          assertNodeEditable(graph, id)
          graph.runPreviewUpdates(() => updateNode(id, changes), capture)
          ctx.requestRepaint()
        } catch (error) {
          preview.cancel()
          throw error
        }
      },
      commit() {
        if (closed) return
        try {
          for (const id of targets) assertNodeEditable(graph, id)
        } catch (error) {
          preview.cancel()
          throw error
        }
        const edits: Array<{ id: string; before: Partial<SceneNode>; after: Partial<SceneNode> }> =
          []
        for (const [id, before] of originals) {
          const node = graph.getNode(id)
          if (!node) continue
          const after = structuredClone(pick(node, Object.keys(before) as (keyof SceneNode)[]))
          if (!isEqual(before, after)) edits.push({ id, before, after })
        }
        close()
        if (edits.length === 0) {
          if (originals.size) ctx.requestRender()
          return
        }
        // Back to what the layers held, so the commit reports each to graph observers before it
        // changes them, as the other previews do; otherwise a saved .fig sees no change.
        for (const edit of edits) graph.updateNodePreview(edit.id, structuredClone(edit.before))
        function apply(direction: 'before' | 'after') {
          for (const edit of edits) {
            const update = () => graph.updateNode(edit.id, structuredClone(edit[direction]))
            if (layoutOnly.has(edit.id)) graph.withLayoutMutations(update)
            else update()
          }
          // Undo gives the previewed layers the marks they had before it; redo marks them again
          // as the commit did.
          if (direction === 'before') restoreSources(graph, sourcesBefore)
          ctx.requestRender()
        }
        // Publish the complete preview delta, including the layout children and implicit edits,
        // before recording it, so the step owns the marks this commit adds.
        apply('after')
        ctx.undo.push({ label, forward: () => apply('after'), inverse: () => apply('before') })
      },
      cancel() {
        if (closed) return
        close()
        for (const [id, previous] of originals)
          graph.updateNodePreview(id, structuredClone(previous))
        // The marks go back without a node update: cancelling publishes no committed node edits.
        for (const [id, source] of sourcesBefore) {
          const node = graph.getNode(id)
          if (node) node.source = structuredClone(source)
        }
        if (originals.size) ctx.requestRender()
      }
    }
    for (const event of ['selection:changed', 'page:changed', 'graph:replaced'] as const) {
      subscriptions.push(ctx.onEditorEvent(event, preview.cancel))
    }
    subscriptions.push(
      ctx.onEditorEvent('node:deleted', (id) => {
        if (targets.has(id) || originals.has(id)) preview.cancel()
      })
    )
    current = preview
    return preview
  }

  return { beginNodePreview, cancelNodePreviews }
}
