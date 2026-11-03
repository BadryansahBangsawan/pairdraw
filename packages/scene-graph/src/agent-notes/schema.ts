import * as v from 'valibot'

/** The longest note an agent reads; longer text is cut where it is read, never refused. */
export const AGENT_NOTE_MAX_LENGTH = 4000

const noteTextSchema = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty(),
  v.maxLength(AGENT_NOTE_MAX_LENGTH)
)

/**
 * Notes a person leaves on a layer for an agent: `context` says what the layer means or does
 * (such as "opens the sign-up dialog") and `prompt` is a request about it. At least one is set.
 */
export const agentNotesSchema = v.pipe(
  v.object({
    context: v.optional(noteTextSchema),
    prompt: v.optional(noteTextSchema)
  }),
  v.check(
    ({ context, prompt }) => context !== undefined || prompt !== undefined,
    'A layer note needs a context or a prompt'
  )
)

export type AgentNotes = v.InferOutput<typeof agentNotesSchema>
