import type { SceneGraph } from '@pairdraw/scene-graph'
import { variantInstanceFor } from '@pairdraw/scene-graph/components'
import { instanceMainComponent } from '@pairdraw/scene-graph/instances'

import { reflow } from '#core/editor/play/states'
import { extractPageContext, findPageId } from '#core/io/subgraph'
import { computeAllLayouts, computeLayout } from '#core/layout'

import { withoutInheritedCopies } from './reactions'

/**
 * What the canvas draws in place of a top-level frame while play changed it: the frame's private
 * copy, a count that grows with every change, and the layers the changes touched, whose cached
 * drawings are stale.
 */
export interface PlaySceneView {
  readonly graph: SceneGraph
  readonly revision: number
  readonly touched: ReadonlySet<string>
}

/** One Change to: the instance it switched, in the frame it sits in, and the two variants. */
export interface PlayChange {
  rootId: string
  instanceId: string
  from: string
  to: string
}

export interface PlayScene extends PlaySceneView {
  /**
   * Shows `variantId` on the instance a Change to from `sourceId` switches: the source or its
   * nearest instance ancestor that shows a variant of that set. Null when there is none, or it
   * already shows the variant.
   */
  changeTo(sourceId: string, variantId: string): PlayChange | null
}

/** The instance a Change to from `sourceId` to `variantId` switches inside `rootId`, if any. */
export function changeTarget(
  graph: SceneGraph,
  rootId: string,
  sourceId: string,
  variantId: string
): string | null {
  const variant = graph.getNode(variantId)
  if (variant?.type !== 'COMPONENT' || !variant.parentId) return null
  const instance = variantInstanceFor(graph, sourceId, variant.parentId)
  if (!instance || !graph.isDescendant(instance.id, rootId)) return null
  return instanceMainComponent(graph, instance)?.id === variantId ? null : instance.id
}

/**
 * Lays out a switched instance, then each auto layout around it up to the frame, as an edit lays
 * out the layer it changed and the auto layouts that hug it; the rest of the frame keeps its
 * layout.
 */
function layOutAround(graph: SceneGraph, instanceId: string, rootId: string): void {
  reflow(graph, instanceId)
  computeAllLayouts(graph, instanceId)
  let current = graph.getNode(instanceId)
  while (current && current.id !== rootId && current.parentId) {
    current = graph.getNode(current.parentId)
    if (current && current.layoutMode !== 'NONE') computeLayout(graph, current.id)
  }
}

/**
 * A top-level frame as play shows it once an interaction changed it: a private copy of the frame,
 * with every variant its instances can switch to, that the document, undo, autosave, and
 * collaborators never see.
 */
export function createPlayScene(design: SceneGraph, rootId: string): PlayScene {
  const pageId = findPageId(design, rootId) ?? design.rootId
  const graph = extractPageContext(design, pageId, [rootId], {
    componentSets: true,
    shareTables: true
  })
  const touched = new Set<string>()
  let revision = 0

  function touch(id: string): void {
    touched.add(id)
  }

  return {
    graph,
    touched,
    get revision() {
      return revision
    },
    changeTo(sourceId, variantId) {
      const instanceId = changeTarget(graph, rootId, sourceId, variantId)
      const instance = instanceId ? graph.getNode(instanceId) : undefined
      const previous = instance && instanceMainComponent(graph, instance)
      if (!instance || !previous) return null
      const stop = graph.onNodeEvents({
        created: (node) => touch(node.id),
        updated: touch,
        deleted: touch
      })
      try {
        graph.swapInstanceComponent(instance.id, variantId, { keepName: true })
        graph.updateNode(instance.id, {
          prototypeReactions: withoutInheritedCopies(instance.prototypeReactions, previous)
        })
        layOutAround(graph, instance.id, rootId)
      } finally {
        stop()
      }
      graph.closest(instance.id, (node) => {
        touch(node.id)
        return node.id === rootId
      })
      revision += 1
      return { rootId, instanceId: instance.id, from: previous.id, to: variantId }
    }
  }
}
