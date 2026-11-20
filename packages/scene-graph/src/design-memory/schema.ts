import * as v from 'valibot'

/** How many values, decisions and examples one document's memory keeps. */
export const DESIGN_MEMORY_LIMITS = {
  colors: 128,
  fonts: 16,
  numbers: 32,
  decisions: 40,
  decisionLength: 400,
  examples: 12,
  fontLength: 100
} as const

/** The kinds of value a memory allows, each with its own list and enforcement. */
export const DESIGN_MEMORY_GROUPS = ['colors', 'fonts', 'fontSizes', 'spacing', 'radius'] as const
export type DesignMemoryGroup = (typeof DESIGN_MEMORY_GROUPS)[number]

/**
 * What happens to an agent's edit that uses a value the memory does not allow: it is undone and
 * the agent told the allowed values, it goes through with a warning, or nothing is checked.
 * People's own edits are never refused; lint lists them.
 */
export const DESIGN_MEMORY_ENFORCEMENTS = ['refuse', 'warn', 'off'] as const
export type DesignMemoryEnforcement = (typeof DESIGN_MEMORY_ENFORCEMENTS)[number]

export const DESIGN_DECISION_AUTHORS = ['person', 'agent'] as const
export type DesignDecisionAuthor = (typeof DESIGN_DECISION_AUTHORS)[number]

const enforcementSchema = v.picklist(DESIGN_MEMORY_ENFORCEMENTS)

/** A color as a memory keeps it: `#RRGGBB`, since alpha is never compared. */
const hexColorSchema = v.pipe(v.string(), v.regex(/^#[0-9A-F]{6}$/))
const fontFamilySchema = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty(),
  v.maxLength(DESIGN_MEMORY_LIMITS.fontLength)
)
const fontSizeSchema = v.pipe(v.number(), v.finite(), v.gtValue(0))
const lengthSchema = v.pipe(v.number(), v.finite(), v.minValue(0))

/**
 * One group: `fromSystem` allows what the document's variables and styles hold, and `values`
 * adds values of the person's own.
 */
function valueGroup<T>(value: v.GenericSchema<unknown, T>, max: number) {
  return v.object({
    fromSystem: v.boolean(),
    values: v.pipe(v.array(value), v.maxLength(max)),
    enforce: enforcementSchema
  })
}

const decisionSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  text: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty(),
    v.maxLength(DESIGN_MEMORY_LIMITS.decisionLength)
  ),
  author: v.picklist(DESIGN_DECISION_AUTHORS)
})

const exampleSchema = v.object({ nodeId: v.pipe(v.string(), v.nonEmpty()) })

/**
 * A document's design rules for agents: the values its designs may use, decisions written down
 * about them, and frames pinned as examples to follow.
 */
export const designMemorySchema = v.object({
  version: v.literal(1),
  colors: valueGroup(hexColorSchema, DESIGN_MEMORY_LIMITS.colors),
  fonts: valueGroup(fontFamilySchema, DESIGN_MEMORY_LIMITS.fonts),
  fontSizes: valueGroup(fontSizeSchema, DESIGN_MEMORY_LIMITS.numbers),
  spacing: valueGroup(lengthSchema, DESIGN_MEMORY_LIMITS.numbers),
  radius: valueGroup(lengthSchema, DESIGN_MEMORY_LIMITS.numbers),
  decisions: v.pipe(v.array(decisionSchema), v.maxLength(DESIGN_MEMORY_LIMITS.decisions)),
  examples: v.pipe(v.array(exampleSchema), v.maxLength(DESIGN_MEMORY_LIMITS.examples))
})

export type DesignMemory = v.InferOutput<typeof designMemorySchema>
export type DesignDecision = DesignMemory['decisions'][number]
export type DesignExample = DesignMemory['examples'][number]
