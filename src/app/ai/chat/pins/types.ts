import type * as v from 'valibot'

import type {
  conversationPinsSchema,
  pinnedReferenceSchema,
  styleKitColorSchema,
  styleKitSchema
} from './schema'

export type StyleKitColor = v.InferOutput<typeof styleKitColorSchema>
export type StyleKit = v.InferOutput<typeof styleKitSchema>
export type PinnedReference = v.InferOutput<typeof pinnedReferenceSchema>
export type ConversationPins = v.InferOutput<typeof conversationPinsSchema>

/** A conversation with nothing pinned; each caller gets its own copy. */
export function emptyPins(): ConversationPins {
  return { styleKit: null, references: [] }
}

export function hasPins(pins: ConversationPins | undefined): boolean {
  return Boolean(pins && (pins.styleKit || pins.references.length > 0))
}

export function pinCount(pins: ConversationPins | undefined): number {
  if (!pins) return 0
  return (pins.styleKit ? 1 : 0) + pins.references.length
}
