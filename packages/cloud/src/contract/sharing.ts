import * as v from 'valibot'

import { collaborationPrincipalSchema } from './collaboration'
import { documentPermissionSchema, requestImageLinksSchema } from './documents'
import { workspaceRoleSchema } from './workspaces'

export const documentShareSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  documentId: v.pipe(v.string(), v.uuid()),
  permission: documentPermissionSchema,
  roomEpoch: v.pipe(v.number(), v.integer(), v.minValue(0)),
  createdBy: v.string(),
  createdAt: v.string(),
  updatedAt: v.string(),
  expiresAt: v.nullable(v.string()),
  revokedAt: v.nullable(v.string()),
  lastUsedAt: v.nullable(v.string()),
  /**
   * The revision a snapshot link shows, frozen as it was shared, or null for a live link that
   * opens the document's room. Servers that predate snapshots leave it out.
   */
  revisionId: v.optional(v.nullable(v.pipe(v.string(), v.uuid())), null)
})
export type DocumentShare = v.InferOutput<typeof documentShareSchema>

/**
 * Which revision a snapshot link pins: the document's current one, or one of its revisions by ID.
 * A snapshot link is always view-only and never opens the document's room.
 */
export const shareSnapshotSchema = v.union([v.literal('current'), v.pipe(v.string(), v.uuid())])
export type ShareSnapshot = v.InferOutput<typeof shareSnapshotSchema>

/** When a link stops working, as an ISO timestamp; `null` keeps it working until revoked. */
const shareExpirySchema = v.optional(v.nullable(v.pipe(v.string(), v.isoTimestamp())))

export const createDocumentShareSchema = v.pipe(
  v.object({
    permission: documentPermissionSchema,
    expiresAt: shareExpirySchema,
    /** Makes a snapshot link to this revision instead of a live link. */
    snapshot: v.optional(shareSnapshotSchema)
  }),
  v.check(
    (input) => input.snapshot === undefined || input.permission === 'view',
    'A snapshot link only lets people view'
  )
)
export type CreateDocumentShareInput = v.InferOutput<typeof createDocumentShareSchema>

export const updateDocumentShareSchema = v.object({
  permission: v.optional(documentPermissionSchema),
  expiresAt: shareExpirySchema,
  /** Pins a snapshot link to another revision, as Update snapshot does; live links refuse it. */
  snapshot: v.optional(shareSnapshotSchema)
})
export type UpdateDocumentShareInput = v.InferOutput<typeof updateDocumentShareSchema>

export const resolveDocumentShareSchema = v.object({
  secret: v.pipe(v.string(), v.minLength(32), v.maxLength(128)),
  guestName: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(80))),
  guestId: v.optional(v.pipe(v.string(), v.minLength(16), v.maxLength(128)))
})
export type ResolveDocumentShareInput = v.InferOutput<typeof resolveDocumentShareSchema>

/** A guest's request for the links of images a shared document's live room names. */
export const requestSharedImageLinksSchema = v.object({
  ...resolveDocumentShareSchema.entries,
  ...requestImageLinksSchema.entries
})
export type RequestSharedImageLinksInput = v.InferOutput<typeof requestSharedImageLinksSchema>

export function parseRequestSharedImageLinks(input: unknown): RequestSharedImageLinksInput {
  return v.parse(requestSharedImageLinksSchema, input)
}

export const resolvedDocumentShareSchema = v.object({
  documentId: v.pipe(v.string(), v.uuid()),
  permission: documentPermissionSchema,
  principal: collaborationPrincipalSchema,
  roomEpoch: v.pipe(v.number(), v.integer(), v.minValue(0)),
  /** The revision a snapshot link shows; null for a live link. */
  revisionId: v.optional(v.nullable(v.pipe(v.string(), v.uuid())), null)
})
export type ResolvedDocumentShare = v.InferOutput<typeof resolvedDocumentShareSchema>

export const cloudUserProfileSchema = v.object({
  id: v.string(),
  name: v.string(),
  email: v.pipe(v.string(), v.email()),
  image: v.nullable(v.pipe(v.string(), v.url()))
})
export type CloudUserProfile = v.InferOutput<typeof cloudUserProfileSchema>

export const documentGrantSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  documentId: v.pipe(v.string(), v.uuid()),
  userId: v.string(),
  permission: documentPermissionSchema,
  createdBy: v.string(),
  createdAt: v.string(),
  updatedAt: v.string()
})
export type DocumentGrant = v.InferOutput<typeof documentGrantSchema>

/** What accepting an invitation gave: access to a document, or a place in a workspace. */
export const acceptedInvitationSchema = v.variant('kind', [
  v.object({ kind: v.literal('document'), grant: documentGrantSchema }),
  v.object({
    kind: v.literal('workspace'),
    workspaceId: v.pipe(v.string(), v.uuid()),
    role: workspaceRoleSchema
  })
])
export type AcceptedInvitation = v.InferOutput<typeof acceptedInvitationSchema>

export const lookupCloudUserSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email())
})
export type LookupCloudUserInput = v.InferOutput<typeof lookupCloudUserSchema>

export const putDocumentGrantSchema = v.object({ permission: documentPermissionSchema })
export type PutDocumentGrantInput = v.InferOutput<typeof putDocumentGrantSchema>

export const createDocumentInvitationSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.toLowerCase(), v.email()),
  permission: documentPermissionSchema
})
export type CreateDocumentInvitationInput = v.InferOutput<typeof createDocumentInvitationSchema>

export const acceptDocumentInvitationSchema = v.object({
  token: v.pipe(v.string(), v.minLength(32), v.maxLength(128))
})
export type AcceptDocumentInvitationInput = v.InferOutput<typeof acceptDocumentInvitationSchema>

export const createInvitationContinuationSchema = v.object({
  invitationId: v.pipe(v.string(), v.uuid()),
  token: v.pipe(v.string(), v.minLength(32), v.maxLength(128))
})
export type CreateInvitationContinuationInput = v.InferOutput<
  typeof createInvitationContinuationSchema
>

export const invitationContinuationSchema = v.object({
  id: v.pipe(v.string(), v.minLength(16), v.maxLength(128))
})
export type InvitationContinuation = v.InferOutput<typeof invitationContinuationSchema>

const invitationPreviewFields = {
  inviterName: v.string(),
  expiresAt: v.string(),
  recipientHint: v.string()
}

/** What an invitation link opens: one document, or a whole workspace. */
export const invitationPreviewSchema = v.variant('kind', [
  v.object({
    kind: v.literal('document'),
    documentName: v.string(),
    permission: documentPermissionSchema,
    ...invitationPreviewFields
  }),
  v.object({
    kind: v.literal('workspace'),
    workspaceName: v.string(),
    role: workspaceRoleSchema,
    ...invitationPreviewFields
  })
])
export type InvitationPreview = v.InferOutput<typeof invitationPreviewSchema>

export const documentInvitationSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  documentId: v.pipe(v.string(), v.uuid()),
  email: v.pipe(v.string(), v.email()),
  permission: documentPermissionSchema,
  invitedBy: v.string(),
  invitedAt: v.string(),
  expiresAt: v.string(),
  acceptedAt: v.nullable(v.string())
})
export type DocumentInvitation = v.InferOutput<typeof documentInvitationSchema>

export function parseCreateInvitationContinuation(
  input: unknown
): CreateInvitationContinuationInput {
  return v.parse(createInvitationContinuationSchema, input)
}

export function parseLookupCloudUser(input: unknown): LookupCloudUserInput {
  return v.parse(lookupCloudUserSchema, input)
}

export function parseCreateDocumentShare(input: unknown): CreateDocumentShareInput {
  return v.parse(createDocumentShareSchema, input)
}

export function parseUpdateDocumentShare(input: unknown): UpdateDocumentShareInput {
  return v.parse(updateDocumentShareSchema, input)
}

export function parseResolveDocumentShare(input: unknown): ResolveDocumentShareInput {
  return v.parse(resolveDocumentShareSchema, input)
}

export function parsePutDocumentGrant(input: unknown): PutDocumentGrantInput {
  return v.parse(putDocumentGrantSchema, input)
}

export function parseCreateDocumentInvitation(input: unknown): CreateDocumentInvitationInput {
  return v.parse(createDocumentInvitationSchema, input)
}

export function parseAcceptDocumentInvitation(input: unknown): AcceptDocumentInvitationInput {
  return v.parse(acceptDocumentInvitationSchema, input)
}
