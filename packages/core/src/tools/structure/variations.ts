import * as v from 'valibot'

import { VARIATION_LABEL_MAX_LENGTH, VARIATION_MAX_COUNT } from '@pairdraw/scene-graph/variations'

import { PairdrawAPI, type VariationSetHandle } from '#core/pairdraw-api'
import { defineTool, nodeIdInputSchema, toolFailure, toolNumber } from '#core/tools/schema'

/** What an agent does after making versions, returned with them. */
const NEXT_STEPS =
  'Change each version in its own direction by editing the layers inside it (batch_update, ' +
  "set_*, or render with parent_id or replace_id inside the version); keep each version's root " +
  'layer. Then check them together with export_image of set_id. Do not call pick_variation ' +
  'unless the person asks you to pick or discard.'

/** A set as the tools report it. */
function setResult(set: VariationSetHandle) {
  const { id, original, versions } = set.toJSON()
  return { set_id: id, original, versions }
}

export const createVariationsTool = defineTool({
  name: 'create_variations',
  description:
    `Copy a layer 1 to ${VARIATION_MAX_COUNT} times as versions side by side in a section beside it, ` +
    'so the person can compare them and keep one. Label each version with the one idea it tries ' +
    '("Calmer palette", "Denser list"). Then change the layers inside each version with ' +
    'batch_update, set_* or render (parent_id = the version, or replace_id = a layer inside it); ' +
    "keep each version's own root layer, since a version whose root becomes another kind of " +
    'layer (a frame for an instance) cannot replace the original. Check them all at once with ' +
    'export_image of the set id. The original does not change. On a version, it copies that ' +
    'version into the same set. Leave picking to the person (pick_variation).',
  execution: { kind: 'sync', mutation: 'document' },
  input: v.strictObject({
    id: v.pipe(nodeIdInputSchema, v.description('Layer to vary, or a version to copy')),
    count: toolNumber(
      v.pipe(
        v.number(),
        v.integer(),
        v.minValue(1),
        v.maxValue(VARIATION_MAX_COUNT),
        v.description('How many versions to make')
      )
    ),
    labels: v.optional(
      v.pipe(
        v.array(v.pipe(v.string(), v.maxLength(VARIATION_LABEL_MAX_LENGTH))),
        v.maxLength(VARIATION_MAX_COUNT),
        v.description('What each version tries, in order; one per version at most')
      )
    )
  }),
  execute: (figma, { id, count, labels }) => {
    try {
      const { set, versions } = new PairdrawAPI(figma).createVariations(id, { count, labels })
      const { original } = set.toJSON()
      return {
        set_id: set.id,
        original_id: original?.id ?? id,
        versions: versions.map((version) => ({ id: version.id, name: version.name })),
        next: NEXT_STEPS
      }
    } catch (error) {
      return toolFailure(error)
    }
  }
})

export const listVariations = defineTool({
  name: 'list_variations',
  description:
    'List sets of variations: the set holding a layer (its section, a version, or a layer ' +
    'inside one), or every set on the current page, each with its original and versions.',
  execution: { kind: 'sync', mutation: 'none' },
  input: v.strictObject({
    id: v.optional(v.pipe(nodeIdInputSchema, v.description('A layer in the set to read')))
  }),
  execute: (figma, { id }) => {
    try {
      const pairdraw = new PairdrawAPI(figma)
      if (id === undefined) return { sets: pairdraw.variations.map(setResult) }
      const set = pairdraw.getVariations(id)
      return { sets: set ? [setResult(set)] : [] }
    } catch (error) {
      return toolFailure(error)
    }
  }
})

export const pickVariation = defineTool({
  name: 'pick_variation',
  description:
    'Only when the person asked to pick or discard: keep one version of a set of variations in ' +
    'place of its original, which keeps its id, name, and place, and remove the rest; or discard ' +
    'them all with keep: null.',
  execution: { kind: 'sync', mutation: 'document' },
  input: v.strictObject({
    set_id: v.pipe(nodeIdInputSchema, v.description('The set, or any layer in it')),
    keep: v.pipe(
      v.nullable(nodeIdInputSchema),
      v.description('The version to keep, or null to discard every version')
    )
  }),
  execute: (figma, { set_id, keep }) => {
    try {
      const set = new PairdrawAPI(figma).getVariations(set_id)
      if (!set) return { error: `"${set_id}" is not in a set of variations` }
      const { original, versions } = set.toJSON()
      if (keep === null) {
        set.discard()
        return { original_id: original?.id ?? null, kept: null, removed: versions.length }
      }
      const kept = set.use(keep)
      return { original_id: kept.id, kept: keep, removed: versions.length - 1 }
    } catch (error) {
      return toolFailure(error)
    }
  }
})
