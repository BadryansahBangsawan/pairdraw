import {
  isPublicProfileHandle,
  parsePublishWorkspace,
  parseUpdatePublicProfile
} from '#cloud/contract'
import type { CloudActor } from '#cloud/server/auth'
import type { DocumentService } from '#cloud/server/documents'
import { DocumentNotFoundError } from '#cloud/server/documents/errors'
import { documentParams, validatedJSON, workspaceParams } from '#cloud/server/validation'
import { Hono, type Context } from 'hono'

import {
  PublicProfileForbiddenError,
  PublicProfileHandleTakenError,
  type PublicProfileService
} from './service'

export type PublicProfileRouteEnvironment = {
  Variables: { actor: CloudActor }
}

/** Runs a profile action, answering its domain errors with their HTTP codes. */
async function profileRoute<T>(context: Context, action: () => Promise<T>): Promise<T | Response> {
  try {
    return await action()
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return context.json({ error: { code: 'not_found' as const } }, 404)
    }
    if (error instanceof PublicProfileForbiddenError) {
      return context.json({ error: { code: 'forbidden' as const } }, 403)
    }
    if (error instanceof PublicProfileHandleTakenError) {
      return context.json({ error: { code: 'handle_taken' as const } }, 409)
    }
    throw error
  }
}

/** The service, or a 404 answer where the deployment serves no public profiles. */
function required(service: PublicProfileService | undefined): PublicProfileService {
  if (!service) throw new DocumentNotFoundError()
  return service
}

/**
 * The signed-in person's own public profile and which of their workspaces it lists. Without a
 * service every route answers 404.
 */
export function createPublicProfileSettingsRoutes(service?: PublicProfileService) {
  return new Hono<PublicProfileRouteEnvironment>()
    .get('/profile', (context) =>
      profileRoute(context, async () =>
        context.json({ profile: await required(service).settings(context.get('actor').userId) })
      )
    )
    .put('/profile', validatedJSON(parseUpdatePublicProfile), (context) =>
      profileRoute(context, async () =>
        context.json({
          profile: await required(service).update(
            context.get('actor').userId,
            context.req.valid('json')
          )
        })
      )
    )
    .put(
      '/workspaces/:workspaceId/public',
      workspaceParams,
      validatedJSON(parsePublishWorkspace),
      (context) =>
        profileRoute(context, async () =>
          context.json({
            profile: await required(service).publishWorkspace(
              context.get('actor').userId,
              context.req.param('workspaceId'),
              context.req.valid('json').public
            )
          })
        )
    )
}

/** What anyone may read without signing in: profiles and the documents they list. */
export function createPublicProfileRoutes(
  service: PublicProfileService | undefined,
  documents: DocumentService
) {
  return new Hono()
    .get('/profiles/:handle', (context) =>
      profileRoute(context, async () => {
        const handle = context.req.param('handle').toLowerCase()
        const profile = isPublicProfileHandle(handle)
          ? await required(service).publicProfile(handle)
          : null
        if (!profile) throw new DocumentNotFoundError()
        return context.json({ profile })
      })
    )
    .post('/documents/:documentId/document', documentParams, (context) =>
      profileRoute(context, async () => {
        const documentId = context.req.param('documentId')
        await required(service).requirePublicDocument(documentId)
        return context.json({ document: await documents.downloadShared(documentId) })
      })
    )
}
