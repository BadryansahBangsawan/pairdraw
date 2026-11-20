import * as v from 'valibot'

/** The most versions one request makes. */
export const VARIATION_MAX_COUNT = 8

/** The longest label a version's name carries. */
export const VARIATION_LABEL_MAX_LENGTH = 40

/** The most layers one request copies, counting every version's layers. */
export const VARIATION_MAX_LAYERS = 10_000

/**
 * What marks a section as a set of variations: the layer they are versions of, and a fingerprint
 * of that layer when they were made, so a front end can say it changed since. The versions are
 * the section's own children, so none of them needs a mark of its own.
 */
export const variationSetSchema = v.object({
  version: v.literal(1),
  originalId: v.pipe(v.string(), v.nonEmpty()),
  originalFingerprint: v.optional(v.string())
})

export type VariationSet = v.InferOutput<typeof variationSetSchema>

/**
 * On a layer of a version, the id of the main component or component set of the original it
 * stands in for: an instance of the component, or a frame of instances of the set's variants.
 */
export const variationStandInSchema = v.pipe(v.string(), v.nonEmpty())
