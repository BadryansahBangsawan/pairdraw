import {
  publicDocumentDownloadSchema,
  publicProfileSchema,
  publicProfileSettingsSchema,
  type DocumentDownload,
  type PublicProfile,
  type PublicProfileSettings,
  type UpdatePublicProfileInput
} from '#cloud/contract'
import type { CloudAPI, PublicCloudAPI } from '#cloud/server/api'
import type { hc } from 'hono/client'
import * as v from 'valibot'

import { CloudAPIError, parseResponse, type CloudClientDiagnostic } from './response'

const settingsResponseSchema = v.object({ profile: publicProfileSettingsSchema })
const profileResponseSchema = v.object({ profile: publicProfileSchema })

/** Public profiles: the signed-in person's own settings, and anyone's profile and documents. */
export function createProfileRequests(
  client: ReturnType<typeof hc<CloudAPI>>,
  publicClient: ReturnType<typeof hc<PublicCloudAPI>>,
  onDiagnostic?: CloudClientDiagnostic
) {
  return {
    async getPublicProfileSettings(): Promise<PublicProfileSettings> {
      const response = await parseResponse(
        client.profile.$get(),
        settingsResponseSchema,
        onDiagnostic
      )
      return response.profile
    },
    /** Claims or changes the handle and bio; a null handle removes the public profile. */
    async updatePublicProfile(input: UpdatePublicProfileInput): Promise<PublicProfileSettings> {
      const response = await parseResponse(
        client.profile.$put({ json: input }),
        settingsResponseSchema,
        onDiagnostic
      )
      return response.profile
    },
    /** Lists a workspace on its administrators' public profiles, or takes it off. */
    async publishWorkspace(workspaceId: string, published: boolean) {
      const response = await parseResponse(
        client.workspaces[':workspaceId'].public.$put({
          param: { workspaceId },
          json: { public: published }
        }),
        settingsResponseSchema,
        onDiagnostic
      )
      return response.profile
    },
    /** Someone's public profile, or null when no profile has the handle. */
    async getPublicProfile(handle: string): Promise<PublicProfile | null> {
      try {
        const response = await parseResponse(
          publicClient.public.profiles[':handle'].$get({ param: { handle } }),
          profileResponseSchema,
          onDiagnostic
        )
        return response.profile
      } catch (error) {
        if (error instanceof CloudAPIError && error.status === 404) return null
        throw error
      }
    },
    /** A document a public profile lists, as anyone may download it. */
    async getPublicDocument(documentId: string): Promise<DocumentDownload> {
      const response = await parseResponse(
        publicClient.public.documents[':documentId'].document.$post({ param: { documentId } }),
        publicDocumentDownloadSchema,
        onDiagnostic
      )
      return response.document
    }
  }
}
