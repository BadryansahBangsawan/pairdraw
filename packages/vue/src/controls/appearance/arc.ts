import { computed } from 'vue'

import { arcFieldValue, arcOf, arcWithField, type ArcField } from '@pairdraw/core/geometry'
import type { ArcData, SceneNode } from '@pairdraw/scene-graph'

import { MIXED, type MixedValue } from '#vue/controls/node-props/use'
import { useEditor } from '#vue/editor/context'
import { useSelectionState } from '#vue/editor/selection-state/use'
import { useSceneComputed } from '#vue/internal/scene-computed/use'

/** What an arc edit records, so a scrub that is cancelled or undone puts it back exactly. */
type ArcSnapshot = Pick<SceneNode, 'arcData' | 'fillGeometry' | 'strokeGeometry'>

/**
 * Headless state and actions for the selected ellipses' arcs: their start, sweep, and ratio as
 * numbers, the same values the on-canvas handles show. A selection of several ellipses shows a
 * field's shared value, MIXED where they differ, and edits them all as one step.
 */
export function useArc() {
  const editor = useEditor()
  const { selectedIds } = useSelectionState()

  const ellipses = useSceneComputed(() => {
    const nodes = [...selectedIds.value].map((id) => editor.graph.getNode(id))
    return nodes.length > 0 && nodes.every((node) => node?.type === 'ELLIPSE')
      ? nodes.filter((node): node is SceneNode => node !== undefined)
      : []
  })
  const active = computed(() => ellipses.value.length > 0)

  function value(field: ArcField): MixedValue<number> {
    const values = ellipses.value.map((node) => arcFieldValue(arcOf(node), field))
    if (values.length === 0) return 0
    return values.every((entry) => entry === values[0]) ? values[0] : MIXED
  }

  const start = computed(() => value('start'))
  const sweep = computed(() => value('sweep'))
  const ratio = computed(() => value('ratio'))

  /** Each layer's arc before the edit in progress, and what restoring it puts back. */
  const before = new Map<string, { arc: ArcData; previous: ArcSnapshot }>()

  function update(field: ArcField, next: number) {
    for (const node of ellipses.value) {
      let entry = before.get(node.id)
      if (!entry) {
        const { arcData, fillGeometry, strokeGeometry } = node
        entry = { arc: arcOf(node), previous: { arcData, fillGeometry, strokeGeometry } }
        before.set(node.id, entry)
      }
      // The outline a `.fig` stored for the old arc is dropped so the ellipse draws the new one.
      editor.updateNode(node.id, {
        arcData: arcWithField(entry.arc, field, next),
        fillGeometry: [],
        strokeGeometry: []
      })
    }
  }

  function commit(field: ArcField, next: number) {
    if (before.size === 0) update(field, next)
    editor.undo.runBatch('Change arc', () => {
      for (const [id, { previous }] of before) editor.commitNodeUpdate(id, previous, 'Change arc')
    })
    before.clear()
  }

  function cancel() {
    for (const [id, { previous }] of before) editor.updateNode(id, previous)
    before.clear()
  }

  return { active, start, sweep, ratio, update, commit, cancel }
}
