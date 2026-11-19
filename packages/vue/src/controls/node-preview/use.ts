import { tryOnScopeDispose } from '@vueuse/core'
import { getCurrentInstance, onDeactivated } from 'vue'

import type { Editor, NodePreview } from '@pairdraw/core'
import type { SceneNode } from '@pairdraw/scene-graph'

/** Keeps an edit's original targets until its terminal event, even after selection changes. */
export function useNodePreview(editor: Editor) {
  let preview: NodePreview | undefined
  let targets: readonly string[] = []

  /** Previews `changes` on every target, or the changes a function gives for each one. */
  function update(
    ids: readonly string[],
    changes: Partial<SceneNode> | ((id: string) => Partial<SceneNode>),
    label: string
  ) {
    if (!preview) {
      if (!ids.length) return
      targets = [...ids]
      preview = editor.beginNodePreview(label)
    }
    try {
      for (const id of targets) {
        preview.update(id, typeof changes === 'function' ? changes(id) : changes)
      }
    } catch (error) {
      cancel()
      throw error
    }
  }

  /** Previews a change for each named node, such as the layers a resize places. */
  function updateNodes(changes: ReadonlyMap<string, Partial<SceneNode>>, label: string) {
    if (!changes.size) return
    if (!preview) {
      targets = [...changes.keys()]
      preview = editor.beginNodePreview(label)
    }
    try {
      for (const [id, patch] of changes) preview.update(id, patch)
    } catch (error) {
      cancel()
      throw error
    }
  }

  function takePreview() {
    const current = preview
    preview = undefined
    targets = []
    return current
  }

  /** Whether a preview is running, so a caller can tell an edit's first preview from its later ones. */
  function isActive() {
    return preview !== undefined
  }

  function commit() {
    takePreview()?.commit()
  }

  function cancel() {
    takePreview()?.cancel()
  }

  tryOnScopeDispose(cancel)
  if (getCurrentInstance()) onDeactivated(cancel)
  return { update, updateNodes, commit, cancel, isActive }
}
