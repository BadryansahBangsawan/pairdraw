import type { SceneNode } from '@pairdraw/scene-graph'
import { copyFills, copyStrokes } from '@pairdraw/scene-graph/copy'
import { findInstanceAncestor } from '@pairdraw/scene-graph/instances'
import { cloneInstanceOverrideState } from '@pairdraw/scene-graph/instances/overrides'
import {
  variableBindingOwner,
  isNumericVariableBindingField,
  paintBindingTarget
} from '@pairdraw/scene-graph/variables'

import { reconcileVariableLayouts } from '#core/layout/variables'

import { loadBoundIcons } from './icons'
import { loadBoundFonts } from './text/bound-fonts'
import type { EditorContext } from './types'

/**
 * Fields whose value undoing a binding puts back: numbers, and a font family, whose change shows
 * as a different typeface. Text and visibility keep what the variable gave them, as in Figma.
 */
function restoresValue(path: string): boolean {
  return isNumericVariableBindingField(path) || path === 'fontFamily'
}

export function createVariableBindingActions(ctx: EditorContext) {
  /** A binding change reaches only the layer it is on and the layers inside it. */
  function refreshBindings(nodeId: string) {
    const changed = reconcileVariableLayouts(ctx.graph, { subtrees: [nodeId] })
    loadBoundFonts(ctx, changed)
    void loadBoundIcons(ctx, { subtrees: [nodeId] }).catch((error: unknown) => {
      console.warn(
        'Loading a bound icon failed:',
        error instanceof Error ? error.message : String(error)
      )
    })
    ctx.requestRender()
  }

  function changeBinding(nodeId: string, path: string, variableId?: string) {
    const node = ctx.graph.getNode(nodeId)
    if (!node || (variableId === undefined && !(path in node.boundVariables))) return
    const previous = {
      boundVariables: { ...node.boundVariables },
      variableBindingScales: { ...node.variableBindingScales },
      ...(restoresValue(path) ? { [path]: node[path as keyof SceneNode] } : {})
    }
    // Binding a paint gives it its variable's color, which undo takes back from that paint alone.
    const target = paintBindingTarget(path)
    const targetPaint = target ? node[target.list].at(target.index) : undefined
    const previousPaint =
      target && targetPaint
        ? { ...target, color: { ...targetPaint.color }, opacity: targetPaint.opacity }
        : null
    const owner = variableBindingOwner(ctx.graph, node)
    const nearest = findInstanceAncestor(ctx.graph, nodeId)
    const owners = new Map(
      [owner, ...(nearest ? [nearest] : [])].map(
        (item) => [item.id, cloneInstanceOverrideState(item.instanceOverrides)] as const
      )
    )
    const apply = () => {
      if (variableId === undefined) ctx.graph.unbindVariable(nodeId, path)
      else ctx.graph.bindVariable(nodeId, path, variableId)
      refreshBindings(nodeId)
    }
    apply()
    ctx.undo.push({
      label: variableId === undefined ? 'Unbind variable' : 'Bind variable',
      forward: () => {
        try {
          apply()
        } catch (error) {
          console.warn(
            'Redo variable binding failed:',
            error instanceof Error ? error.message : String(error)
          )
        }
      },
      inverse: () => {
        for (const [id, state] of owners) {
          ctx.graph.updateNode(id, { instanceOverrides: cloneInstanceOverrideState(state) })
        }
        const restored = structuredClone(previous)
        restored.boundVariables = Object.fromEntries(
          Object.entries(restored.boundVariables).filter(([, id]) => ctx.graph.variables.has(id))
        )
        restored.variableBindingScales = Object.fromEntries(
          Object.entries(restored.variableBindingScales).filter(
            ([field]) => field in restored.boundVariables
          )
        )
        const current = ctx.graph.getNode(nodeId)
        if (previousPaint && current?.[previousPaint.list].at(previousPaint.index)) {
          const { list, index, color, opacity } = previousPaint
          const paints = list === 'fills' ? copyFills(current.fills) : copyStrokes(current.strokes)
          Object.assign(paints[index], { color: { ...color }, opacity })
          Object.assign(restored, { [list]: paints })
        }
        ctx.graph.updateNode(nodeId, restored)
        refreshBindings(nodeId)
      }
    })
  }

  return {
    bindVariable: (nodeId: string, path: string, variableId: string) =>
      changeBinding(nodeId, path, variableId),
    unbindVariable: (nodeId: string, path: string) => changeBinding(nodeId, path)
  }
}
