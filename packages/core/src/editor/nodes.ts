import { pick } from 'es-toolkit/object'

import type { SceneNode } from '@pairdraw/scene-graph'
import { fitEnclosingGroups, redoGroupFit, undoGroupFit } from '@pairdraw/scene-graph/group-bounds'
import {
  findInstanceAncestor,
  instanceOverrideFields,
  recordInstanceOverride
} from '@pairdraw/scene-graph/instances'
import { cloneInstanceOverrideState } from '@pairdraw/scene-graph/instances/overrides'
import { styleDetachmentChanges } from '@pairdraw/scene-graph/shared-styles'
import { strokeLineChanges } from '@pairdraw/scene-graph/strokes'

import { groupFitOptions } from '#core/canvas/boolean'
import { textAutoResizeChanges } from '#core/layout/text-auto-resize'
import { reconcileVariableLayouts } from '#core/layout/variables'

import { applyBoundVisibilityEdit, bindsVisibility } from './components/authoring/visibility-edit'
import { createLayoutModeActions } from './layout-mode'
import { createNodePreviewActions } from './node-preview'
import { createNudgeActions } from './nudge'
import { refitGroupsAroundLayers } from './structure/group/bounds'
import { loadBoundFonts } from './text/bound-fonts'
import { pathTextEditChanges } from './text/path-edit'
import type { EditorContext } from './types'
import { createVariableBindingActions } from './variable-bindings'

export function opacityFromBuffer(buffer: string): number {
  if (buffer === '0') return 1
  if (!/^\d+$/.test(buffer)) return 1
  const n = Number.parseInt(buffer, 10)
  if (!Number.isFinite(n)) return 1
  const percent = buffer.length === 1 ? n * 10 : n
  return Math.min(100, Math.max(0, percent)) / 100
}

/** Fields whose change makes a frame take a new size of its own. */
const SIZE_DEPENDENT_FIELDS = ['primaryAxisSizing', 'counterAxisSizing', 'layoutMode'] as const

/** Whether an auto layout frame places this layer, so its own x and y do not stay where they are put. */
function layOutByParent(ctx: EditorContext, id: string): boolean {
  const parent = ctx.graph.getNode(ctx.graph.getNode(id)?.parentId ?? '')
  return parent !== undefined && parent.layoutMode !== 'NONE'
}

export function createNodeActions(ctx: EditorContext) {
  // Function declarations below are hoisted, so the preview can wrap updateNode here.
  const previewActions = createNodePreviewActions(ctx, updateNode)
  const layoutModeActions = createLayoutModeActions(ctx, previewActions.beginNodePreview)
  const nudgeActions = createNudgeActions(ctx)
  const variableBindingActions = createVariableBindingActions(ctx)

  function runChangedLayout(id: string, changes: Partial<SceneNode>, fitGroups = false) {
    // A layer's modes reach the layers inside it.
    if (changes.variableModes)
      loadBoundFonts(ctx, reconcileVariableLayouts(ctx.graph, { subtrees: [id] }))
    if (changes.visible !== undefined) refitGroupsAroundLayers(ctx, [id])
    // A group's box is its children's, so it follows a child that moves or resizes in any way,
    // the plugin API's included, not only a drag the canvas committed.
    if (fitGroups && !layOutByParent(ctx, id)) refitGroupsAroundLayers(ctx, [id])
    ctx.runLayoutForNode(id)
  }

  function updateNode(id: string, changes: Partial<SceneNode>) {
    const node = ctx.graph.getNode(id)
    if (!node) return
    // Path-edit last so its reflowed glyphs win over auto-resize's glyph clear
    // (path text is textAutoResize NONE so they don't collide today).
    const nextChanges = styleDetachmentChanges(node, {
      ...changes,
      ...strokeLineChanges(node, changes),
      ...textAutoResizeChanges(node, changes),
      ...pathTextEditChanges(node, changes)
    })
    const overridden = instanceOverrideFields(node, nextChanges)
    ctx.graph.updateNode(id, nextChanges)
    recordInstanceOverride(ctx.graph, id, overridden)
    // The groups around the layer fit in the step that records the edit, so undo takes the box
    // back with the layer. This call changes no step: a drag writes here between its own steps.
    runChangedLayout(id, nextChanges)
  }

  function updateNodeWithUndo(id: string, changes: Partial<SceneNode>, label = 'Update') {
    const node = ctx.graph.getNode(id)
    if (!node) return
    // A layer a boolean property shows or hides sets the property too, in the same undo step.
    // It takes the value even where the layer already shows it, so the two agree.
    const visible = changes.visible
    if (visible !== undefined && bindsVisibility(node)) {
      ctx.undo.runBatch(label, () => {
        recordNodeUpdate(node, changes, label)
        applyBoundVisibilityEdit(ctx, id, visible)
      })
      return
    }
    recordNodeUpdate(node, changes, label)
  }

  function recordNodeUpdate(node: SceneNode, changes: Partial<SceneNode>, label: string) {
    const { id } = node
    // Same ordering rationale as updateNode: reflowed path-text glyphs win.
    const nextChanges = styleDetachmentChanges(node, {
      ...changes,
      ...strokeLineChanges(node, changes),
      ...textAutoResizeChanges(node, changes),
      ...pathTextEditChanges(node, changes)
    })
    const owner = findInstanceAncestor(ctx.graph, id)
    const previousOverrides = owner
      ? cloneInstanceOverrideState(owner.instanceOverrides)
      : undefined
    // A frame whose sizing changes takes its own size with it: fixed keeps the size it had, so
    // undoing the sizing has to put that size back too.
    const restoreSize = SIZE_DEPENDENT_FIELDS.some((field) => field in nextChanges)
    const previous = pick(node, [
      ...(Object.keys(nextChanges) as (keyof SceneNode)[]),
      ...(restoreSize ? (['width', 'height'] as const) : [])
    ]) as Partial<SceneNode>
    const overridden = instanceOverrideFields(node, nextChanges)
    ctx.graph.updateNode(id, nextChanges)
    recordInstanceOverride(ctx.graph, id, overridden)
    runChangedLayout(id, nextChanges, false)
    // A group's box follows its children, so the fit goes in this step: it moves the layer's own
    // coordinates too, and undo has to put both back. A layer an auto layout frame places is
    // positioned by that layout, so its groups' boxes are theirs to settle.
    const fit = layOutByParent(ctx, id)
      ? null
      : fitEnclosingGroups(
          ctx.graph,
          [node.parentId ?? id],
          groupFitOptions(ctx.getRenderer(), ctx.graph)
        )
    ctx.undo.push({
      label,
      forward: () => {
        ctx.graph.updateNode(id, nextChanges)
        recordInstanceOverride(ctx.graph, id, overridden)
        runChangedLayout(id, nextChanges, false)
        if (fit) redoGroupFit(ctx.graph, fit)
      },
      inverse: () => {
        if (fit) undoGroupFit(ctx.graph, fit)
        ctx.graph.updateNode(id, previous)
        if (owner && previousOverrides)
          ctx.graph.updateNode(owner.id, {
            instanceOverrides: cloneInstanceOverrideState(previousOverrides)
          })
        runChangedLayout(id, nextChanges, false)
      }
    })
    ctx.requestRender()
  }

  function setOpacity(opacity: number, coalesceKey?: string) {
    if (!Number.isFinite(opacity)) return
    const clamped = Math.max(0, Math.min(1, opacity))
    const ids = [...ctx.state.selectedIds]
    if (ids.length === 0) return
    const targets = ids.map((id) => ctx.graph.getNode(id)).filter((n): n is SceneNode => n != null)
    const changed = targets.filter((t) => t.opacity !== clamped)
    if (changed.length === 0) return
    ctx.undo.runBatch(
      'Set opacity',
      () => {
        for (const target of changed) {
          updateNodeWithUndo(target.id, { opacity: clamped }, 'Set opacity')
        }
      },
      coalesceKey
    )
  }

  return {
    updateNode,
    ...previewActions,
    updateNodeWithUndo,
    setOpacity,
    ...layoutModeActions,
    ...variableBindingActions,
    ...nudgeActions
  }
}

/** The editor's node writes; an edit made through them leaves the shared styles it changes. */
export type NodeActions = ReturnType<typeof createNodeActions>
