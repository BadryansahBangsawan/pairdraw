import * as v from 'valibot'

import { documentDownloadSchema } from './documents'

/** A public profile's address on the server, `/u/<handle>`: lowercase letters, digits, and dashes. */
export const PUBLIC_PROFILE_HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/
export const PUBLIC_PROFILE_BIO_MAX_LENGTH = 280

const handleSchema = v.pipe(
  v.string(),
  v.trim(),
  v.toLowerCase(),
  v.regex(PUBLIC_PROFILE_HANDLE_PATTERN)
)

/** A document a public workspace lists, which anyone may open read-only. */
export const publicDocumentSummarySchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.string(),
  updatedAt: v.string()
})
export type PublicDocumentSummary = v.InferOutput<typeof publicDocumentSummarySchema>

export const publicWorkspaceSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.string(),
  slug: v.string(),
  documents: v.array(publicDocumentSummarySchema)
})
export type PublicWorkspace = v.InferOutput<typeof publicWorkspaceSchema>

/** What anyone sees at `/u/<handle>`: who the person is and the workspaces they made public. */
export const publicProfileSchema = v.object({
  handle: v.string(),
  name: v.string(),
  image: v.nullable(v.string()),
  bio: v.nullable(v.string()),
  workspaces: v.array(publicWorkspaceSchema)
})
export type PublicProfile = v.InferOutput<typeof publicProfileSchema>

/** A workspace the signed-in person administers, and whether it is on their public profile. */
export const publicProfileWorkspaceSettingSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  name: v.string(),
  public: v.boolean()
})
export type PublicProfileWorkspaceSetting = v.InferOutput<
  typeof publicProfileWorkspaceSettingSchema
>

/** The signed-in person's own public profile settings; a null handle means no public profile. */
export const publicProfileSettingsSchema = v.object({
  handle: v.nullable(v.string()),
  bio: v.nullable(v.string()),
  workspaces: v.array(publicProfileWorkspaceSettingSchema)
})
export type PublicProfileSettings = v.InferOutput<typeof publicProfileSettingsSchema>

/** Claims, changes, or (with a null handle) removes the person's public profile. */
export const updatePublicProfileSchema = v.object({
  handle: v.nullable(handleSchema),
  bio: v.optional(
    v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(PUBLIC_PROFILE_BIO_MAX_LENGTH)))
  )
})
export type UpdatePublicProfileInput = v.InferOutput<typeof updatePublicProfileSchema>

/** Lists a workspace on its administrator's public profile, or takes it off. */
export const publishWorkspaceSchema = v.object({ public: v.boolean() })
export type PublishWorkspaceInput = v.InferOutput<typeof publishWorkspaceSchema>

/** A public document as anyone may download it. */
export const publicDocumentDownloadSchema = v.object({ document: documentDownloadSchema })
export type PublicDocumentDownload = v.InferOutput<typeof publicDocumentDownloadSchema>

/** Whether a value is a handle a public profile may take. */
export function isPublicProfileHandle(value: string): boolean {
  return PUBLIC_PROFILE_HANDLE_PATTERN.test(value)
}

export function parseUpdatePublicProfile(input: unknown): UpdatePublicProfileInput {
  return v.parse(updatePublicProfileSchema, input)
}

export function parsePublishWorkspace(input: unknown): PublishWorkspaceInput {
  return v.parse(publishWorkspaceSchema, input)
}
