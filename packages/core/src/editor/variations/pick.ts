import type { SceneGraph } from '@pairdraw/scene-graph'
import {
  VariationError,
  variationPickProblem,
  variationToPick,
  type VariationPickProblem,
  type VariationSetView
} from '@pairdraw/scene-graph/variations'

import { assertNodeEditable, getNodeEditCapability } from '#core/editor/capabilities'

/** Why a version cannot replace its original, including an original a library owns. */
export type PickProblem = VariationPickProblem | 'original-not-editable'

/** Why `versionId` cannot replace the original of `view`, or null when it can. */
export function pickProblemOf(
  graph: SceneGraph,
  view: VariationSetView,
  versionId: string
): PickProblem | null {
  const problem = variationPickProblem(graph, view, versionId)
  if (problem || !view.original) return problem
  return getNodeEditCapability(graph, view.original.id).editable ? null : 'original-not-editable'
}

/**
 * Throws the reason `versionId` cannot replace its original, before anything changes: a layer
 * outside a set, the section itself, or an original that is gone, locked, inside an instance,
 * of another type than the version, or owned by a library.
 */
export function assertVariationPickable(graph: SceneGraph, versionId: string): void {
  const { view, problem } = variationToPick(graph, versionId)
  if (problem) throw new VariationError(problem, versionId)
  if (view.original) assertNodeEditable(graph, view.original.id)
}
