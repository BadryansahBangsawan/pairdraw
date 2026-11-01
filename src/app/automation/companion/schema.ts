import * as v from 'valibot'

/** What `POST /pair` answers once the companion accepts a code. */
export const companionPairingSchema = v.object({
  token: v.pipe(v.string(), v.minLength(32), v.maxLength(256)),
  agentToken: v.pipe(v.string(), v.minLength(32), v.maxLength(256)),
  version: v.pipe(v.string(), v.maxLength(64))
})

/** What `GET /companion` answers to a paired tab. */
export const companionInfoSchema = v.object({
  version: v.pipe(v.string(), v.maxLength(64)),
  workspace: v.pipe(v.string(), v.minLength(1), v.maxLength(4096))
})

/** A message the companion sends as text on an agent or sign-in socket. */
export const companionSocketMessageSchema = v.pipe(
  v.string(),
  v.maxLength(65_536),
  v.parseJson(),
  v.variant('type', [
    v.object({ type: v.literal('ready') }),
    v.object({
      type: v.literal('error'),
      reason: v.picklist(['not-found', 'spawn']),
      command: v.optional(v.string())
    }),
    v.object({
      type: v.literal('exit'),
      code: v.nullable(v.number()),
      signal: v.nullable(v.string())
    }),
    v.object({ type: v.literal('stderr'), text: v.string() }),
    v.object({
      type: v.literal('url'),
      url: v.pipe(v.string(), v.maxLength(2048), v.url(), v.startsWith('https://'))
    }),
    v.object({ type: v.literal('done'), ok: v.boolean() })
  ])
)
