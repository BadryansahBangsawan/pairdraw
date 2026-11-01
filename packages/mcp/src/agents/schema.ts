import * as v from 'valibot'

/** `POST /pair`: the one-time code from the link the companion printed. */
export const pairRequestSchema = v.object({
  code: v.pipe(v.string(), v.minLength(1), v.maxLength(128))
})

/** The first message on an agent socket, since browsers cannot set headers on a WebSocket. */
export const socketAuthSchema = v.pipe(
  v.string(),
  v.maxLength(1024),
  v.parseJson(),
  v.strictObject({
    type: v.literal('auth'),
    token: v.pipe(v.string(), v.minLength(1), v.maxLength(256))
  })
)

/** What the app sends on a sign-in socket after authenticating: the code the sign-in page shows. */
export const signInMessageSchema = v.pipe(
  v.string(),
  v.maxLength(1024),
  v.parseJson(),
  v.strictObject({
    type: v.literal('code'),
    // Printable ASCII without spaces or line breaks, so it cannot inject further input lines.
    code: v.pipe(v.string(), v.minLength(1), v.maxLength(512), v.regex(/^[\x21-\x7E]+$/))
  })
)

/** A JSON-RPC message the app sends an agent; its params, when present, are an object. */
export const acpClientMessageSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.looseObject({
    jsonrpc: v.literal('2.0'),
    params: v.optional(v.record(v.string(), v.unknown()))
  })
)

/** The one `_meta` entry the app sends: the tools Claude's adapter may use without asking. */
export const acpAllowedMetaSchema = v.object({
  claudeCode: v.object({
    options: v.object({
      allowedTools: v.pipe(v.array(v.pipe(v.string(), v.maxLength(256))), v.maxLength(64))
    })
  })
})

/** An MCP server entry in `session/new` that names a URL rather than a command. */
export const acpHTTPServerSchema = v.looseObject({
  type: v.picklist(['http', 'sse']),
  url: v.pipe(v.string(), v.maxLength(2048))
})
