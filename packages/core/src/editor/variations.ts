import {
  applyVariation,
  discardVariations as discardVariationSet,
  originalChangedSince,
  variationSetOf,
  versionOf,
  type VariationSetView
} from '@pairdraw/scene-graph/variations'

import { recordEdit } from './history/edit'
import type { EditorContext } from './types'
import {
  createVariations,
  variationRefusal,
  type CreatedVariations,
  type VariationRequest
} from './variations/create'
import { assertVariationPickable, pickProblemOf, type PickProblem } from './variations/pick'

/** A set of variations as panels show it, from wherever in it the selection is. */
export interface VariationSetState extends VariationSetView {
  /** The version holding the layer asked about, or null for the section itself. */
  version: VariationSetView['versions'][number] | null
  /** Why that version cannot replace the original, or null when it can. */
  pickProblem: PickProblem | null
}

/**
 * Sets of variations: copies of a layer side by side in a section beside it, one of which can
 * replace it. Each command is one undo step.
 */
export function createVariationActions(ctx: EditorContext) {
  /** The set `nodeId` belongs to, with the version holding it, or null outside every set. */
  function getVariationSet(nodeId: string): VariationSetState | null {
    const view = variationSetOf(ctx.graph, nodeId)
    if (!view) return null
    const version = versionOf(ctx.graph, view, nodeId)
    return {
      ...view,
      version,
      pickProblem: version ? pickProblemOf(ctx.graph, view, version.id) : 'not-a-version'
    }
  }

  /**
   * Whether the original of the set holding `nodeId` looks different from when its newest
   * versions were made. It walks the original's layers, so panels ask when they show a set
   * rather than on every edit.
   */
  function isVariationOriginalChanged(nodeId: string): boolean {
    const view = variationSetOf(ctx.graph, nodeId)
    return view ? originalChangedSince(ctx.graph, view) : false
  }

  /** Whether `nodeId` can be varied: copied into a set of variations beside it. */
  function canCreateVariations(nodeId: string): boolean {
    return variationRefusal(ctx.graph, nodeId) === null
  }

  /** Copies `nodeId` into its set of variations, as `create_variations` does. */
  function createVariationsOf(nodeId: string, request: VariationRequest): CreatedVariations {
    const created = recordEdit(ctx, { label: 'Create variations', rollbackOnThrow: true }, () =>
      createVariations(ctx.graph, nodeId, request)
    )
    ctx.requestRender()
    return created
  }

  /** One plain copy of `nodeId` in its set, selected, for a person to change by hand. */
  function duplicateAsVariation(nodeId: string): CreatedVariations {
    const created = createVariationsOf(nodeId, { count: 1 })
    ctx.setSelectedIds(new Set(created.versions.map((version) => version.id)))
    return created
  }

  /** Makes the original look like the version holding `versionId` and removes the set. */
  function pickVariation(versionId: string): string {
    assertVariationPickable(ctx.graph, versionId)
    const originalId = recordEdit(ctx, { label: 'Use variation', rollbackOnThrow: true }, () => {
      const picked = applyVariation(ctx.graph, versionId)
      ctx.runLayoutForNode(picked.originalId)
      return picked.originalId
    })
    ctx.setSelectedIds(new Set([originalId]))
    ctx.requestRender()
    return originalId
  }

  /** Removes the set holding `nodeId` and selects its original, when it is still there. */
  function discardVariations(nodeId: string): string | null {
    const { originalId } = recordEdit(
      ctx,
      { label: 'Discard variations', rollbackOnThrow: true },
      () => discardVariationSet(ctx.graph, nodeId)
    )
    ctx.setSelectedIds(new Set(originalId ? [originalId] : []))
    ctx.requestRender()
    return originalId
  }

  return {
    getVariationSet,
    isVariationOriginalChanged,
    canCreateVariations,
    createVariations: createVariationsOf,
    duplicateAsVariation,
    pickVariation,
    discardVariations
  }
}
