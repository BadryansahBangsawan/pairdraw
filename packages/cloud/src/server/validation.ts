import type { Context } from 'hono'
import { validator } from 'hono/validator'
import * as v from 'valibot'
import { ValiError } from 'valibot'

/** A request part that fails its schema is a 400, never a server error. */
function parseOrReject<T>(parse: (input: unknown) => T, value: unknown, context: Context) {
  try {
    return parse(value)
  } catch (error) {
    if (error instanceof ValiError) {
      return context.json({ error: { code: 'invalid_request' as const } }, 400)
    }
    throw error
  }
}

export function validatedJSON<T>(parse: (input: unknown) => T) {
  return validator('json', (value, context: Context) => parseOrReject(parse, value, context))
}

/** Query string counterpart of `validatedJSON`. */
export function validatedQuery<T>(parse: (input: unknown) => T) {
  return validator('query', (value, context: Context) => parseOrReject(parse, value, context))
}

/**
 * Route parameters, so a malformed id names nothing and never reaches the database: it answers
 * 404 like a row that has gone, as upstream does.
 */
export function validatedParams<T>(parse: (input: unknown) => T) {
  return validator('param', (value, context: Context) => {
    try {
      return parse(value)
    } catch (error) {
      if (error instanceof ValiError) {
        return context.json({ error: { code: 'not_found' as const } }, 404)
      }
      throw error
    }
  })
}

const uuidParamSchema = v.pipe(v.string(), v.uuid())
const workspaceParamsSchema = v.object({ workspaceId: uuidParamSchema })
const textParamSchema = v.pipe(v.string(), v.minLength(1))
const workspaceMemberParamsSchema = v.object({
  workspaceId: uuidParamSchema,
  // The server takes a member id as text: routes accept a username as well as a UUID.
  userId: textParamSchema
})
const workspaceInvitationParamsSchema = v.object({
  workspaceId: uuidParamSchema,
  invitationId: uuidParamSchema
})
const documentParamsSchema = v.object({ documentId: uuidParamSchema })
const documentVersionParamsSchema = v.object({
  documentId: uuidParamSchema,
  versionId: uuidParamSchema
})
const documentShareParamsSchema = v.object({
  documentId: uuidParamSchema,
  shareId: uuidParamSchema
})
const documentUserParamsSchema = v.object({
  documentId: uuidParamSchema,
  userId: textParamSchema
})
const documentInvitationParamsSchema = v.object({
  documentId: uuidParamSchema,
  invitationId: uuidParamSchema
})
/** A share or invitation named on its own, as a public link or an emailed link does. */
const shareParamsSchema = v.object({ shareId: uuidParamSchema })
const invitationParamsSchema = v.object({ invitationId: uuidParamSchema })
const uploadParamsSchema = v.object({ uploadId: uuidParamSchema })

export const workspaceParams = validatedParams((input) => v.parse(workspaceParamsSchema, input))
export const workspaceMemberParams = validatedParams((input) =>
  v.parse(workspaceMemberParamsSchema, input)
)
export const workspaceInvitationParams = validatedParams((input) =>
  v.parse(workspaceInvitationParamsSchema, input)
)
export const documentParams = validatedParams((input) => v.parse(documentParamsSchema, input))
export const documentVersionParams = validatedParams((input) =>
  v.parse(documentVersionParamsSchema, input)
)
export const documentShareParams = validatedParams((input) =>
  v.parse(documentShareParamsSchema, input)
)
export const documentUserParams = validatedParams((input) =>
  v.parse(documentUserParamsSchema, input)
)
export const documentInvitationParams = validatedParams((input) =>
  v.parse(documentInvitationParamsSchema, input)
)
export const shareParams = validatedParams((input) => v.parse(shareParamsSchema, input))
export const invitationParams = validatedParams((input) => v.parse(invitationParamsSchema, input))
export const uploadParams = validatedParams((input) => v.parse(uploadParamsSchema, input))
