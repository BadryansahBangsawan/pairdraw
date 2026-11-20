import { pick } from 'es-toolkit'

import {
  applyVariation,
  discardVariations,
  variationSetOf,
  variationSetsOnPage,
  type VariationSetView
} from '@pairdraw/scene-graph/variations'

import { createVariations, type VariationRequest } from '#core/editor/variations/create'
import { assertVariationPickable } from '#core/editor/variations/pick'
import type { FigmaAPI, FigmaNodeProxy } from '#core/figma-api/index'

import { nodeOf, type NodeRef } from './behaviours'

/** A layer of a set as `toJSON` and the tools report it. */
export interface VariationLayerInfo {
  id: string
  name: string
}

/** A set of variations as `toJSON` and the tools report it. */
export interface VariationSetInfo {
  id: string
  original: VariationLayerInfo | null
  versions: VariationLayerInfo[]
}

const info = (node: VariationLayerInfo): VariationLayerInfo => pick(node, ['id', 'name'])

/**
 * A set of variations: copies of a layer side by side in a section beside it. `id` is the
 * section's; reading a set that was used or discarded throws.
 */
export class VariationSetHandle {
  constructor(
    private readonly figma: FigmaAPI,
    readonly id: string
  ) {}

  private get view(): VariationSetView {
    const view = variationSetOf(this.figma.graph, this.id)
    if (view?.section.id !== this.id) throw new Error(`Variations ${this.id} are gone`)
    return view
  }

  /** The layer the versions vary, or null when it was deleted. */
  get original(): FigmaNodeProxy | null {
    const { original } = this.view
    return original ? this.figma.wrapNode(original.id) : null
  }

  /** The versions, in their order in the section. */
  get versions(): FigmaNodeProxy[] {
    return this.view.versions.map((version) => this.figma.wrapNode(version.id))
  }

  /**
   * Make the original look like `version`, keeping its id, name, and place, and remove the set;
   * returns the original.
   */
  use(version: NodeRef): FigmaNodeProxy {
    const node = nodeOf(this.figma.graph, version)
    if (node.parentId !== this.view.section.id) {
      throw new Error(`${node.name} is not one of these variations`)
    }
    assertVariationPickable(this.figma.graph, node.id)
    return this.figma.wrapNode(applyVariation(this.figma.graph, node.id).originalId)
  }

  /** Remove the set and every version in it; the original stays as it is. */
  discard(): void {
    discardVariations(this.figma.graph, this.view.section.id)
  }

  toJSON(): VariationSetInfo {
    const { section, original, versions } = this.view
    return {
      id: section.id,
      original: original ? info(original) : null,
      versions: versions.map(info)
    }
  }
}

/** Copy a layer into its set of variations, made beside it the first time. */
export function createVariationSet(
  figma: FigmaAPI,
  node: NodeRef,
  request: VariationRequest
): { set: VariationSetHandle; created: FigmaNodeProxy[] } {
  const made = createVariations(figma.graph, nodeOf(figma.graph, node).id, request)
  return {
    set: new VariationSetHandle(figma, made.sectionId),
    created: made.versions.map((version) => figma.wrapNode(version.id))
  }
}

/** The set a layer belongs to: its section, a version, or a layer inside one; else null. */
export function getVariationSet(figma: FigmaAPI, node: NodeRef): VariationSetHandle | null {
  const view = variationSetOf(figma.graph, nodeOf(figma.graph, node).id)
  return view ? new VariationSetHandle(figma, view.section.id) : null
}

/** The sets on a page. */
export function listVariationSets(figma: FigmaAPI, pageId: string): VariationSetHandle[] {
  return variationSetsOnPage(figma.graph, pageId).map(
    (view) => new VariationSetHandle(figma, view.section.id)
  )
}
