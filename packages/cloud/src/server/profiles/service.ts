import type {
  PublicProfile,
  PublicProfileSettings,
  PublicWorkspace,
  UpdatePublicProfileInput
} from '#cloud/contract'
import type { CloudDatabase } from '#cloud/server/db'
import { DocumentNotFoundError } from '#cloud/server/documents/errors'
import { workspaceRole } from '#cloud/server/documents/repository'
import { CLOUD_FEATURE_KEYS, type CloudPolicy } from '#cloud/server/policy'
import { groupBy } from 'es-toolkit'
import type { Kysely } from 'kysely'

/** The handle belongs to someone else's public profile. */
export class PublicProfileHandleTakenError extends Error {
  override readonly name = 'PublicProfileHandleTakenError'
}

/** Only a workspace's administrators put it on their public profile or take it off. */
export class PublicProfileForbiddenError extends Error {
  override readonly name = 'PublicProfileForbiddenError'
}

export type PublicProfileServiceOptions = {
  policy?: CloudPolicy
  deploymentMode?: 'official' | 'self-hosted'
  /**
   * Whether an account's enrollment is approved, where the server admits accounts by approval;
   * a profile whose owner is no longer approved goes dark with them.
   */
  isApproved?: (email: string) => Promise<boolean>
}

/**
 * Public profiles, `/u/<handle>`: a person claims a handle and lists the workspaces they
 * administer and made public themselves. Anyone may read a public workspace's documents while the
 * administrator who published it still administers it and may use the server, and while the
 * workspace's policy allows links and guest viewing, checked when it is published and when read.
 */
export function createPublicProfileService(
  database: Kysely<CloudDatabase>,
  options: PublicProfileServiceOptions = {}
) {
  async function guestsMayView(workspaceId: string, actorId?: string): Promise<boolean> {
    const { policy } = options
    if (!policy) return true
    const context = {
      targetingKey: workspaceId,
      ...(actorId ? { actorId } : {}),
      workspaceId,
      deploymentMode: options.deploymentMode ?? 'self-hosted'
    }
    return (
      (await policy.boolean(CLOUD_FEATURE_KEYS.links, false, context)) &&
      (await policy.boolean(CLOUD_FEATURE_KEYS.guestView, false, context))
    )
  }

  /** Whether an account exists, is not banned, and, where approval admits accounts, is approved. */
  async function accountActive(userId: string): Promise<boolean> {
    const account = await database
      .selectFrom('user')
      .select(['email', 'banned'])
      .where('id', '=', userId)
      .executeTakeFirst()
    if (!account || account.banned === true) return false
    return options.isApproved ? options.isApproved(account.email) : true
  }

  async function adminWorkspaces(userId: string) {
    return database
      .selectFrom('workspace')
      .innerJoin('workspaceMember', 'workspaceMember.workspaceId', 'workspace.id')
      .select([
        'workspace.id',
        'workspace.name',
        'workspace.slug',
        'workspace.publicAt',
        'workspace.publicBy'
      ])
      .where('workspaceMember.userId', '=', userId)
      .where('workspaceMember.role', '=', 'admin')
      .orderBy('workspace.name')
      .execute()
  }

  async function settings(userId: string): Promise<PublicProfileSettings> {
    const profile = await database
      .selectFrom('publicProfile')
      .select(['handle', 'bio'])
      .where('userId', '=', userId)
      .executeTakeFirst()
    const workspaces = await adminWorkspaces(userId)
    return {
      handle: profile?.handle ?? null,
      bio: profile?.bio ?? null,
      workspaces: workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        public: listedBy(workspace, userId)
      }))
    }
  }

  return {
    settings,

    /** Claims or changes the person's handle and bio; a null handle removes the profile. */
    async update(userId: string, input: UpdatePublicProfileInput): Promise<PublicProfileSettings> {
      const { handle } = input
      if (handle === null) {
        await database.deleteFrom('publicProfile').where('userId', '=', userId).execute()
        return settings(userId)
      }
      // A handle whose account was deleted is free again.
      await database
        .deleteFrom('publicProfile')
        .where('handle', '=', handle)
        .where('userId', 'not in', database.selectFrom('user').select('id'))
        .execute()
      const taken = await database
        .selectFrom('publicProfile')
        .select('userId')
        .where('handle', '=', handle)
        .where('userId', '!=', userId)
        .executeTakeFirst()
      if (taken) throw new PublicProfileHandleTakenError()
      const bio = input.bio === undefined ? undefined : input.bio || null
      try {
        await database
          .insertInto('publicProfile')
          .values({ userId, handle, bio: bio ?? null })
          .onConflict((conflict) =>
            conflict.column('userId').doUpdateSet({
              handle,
              ...(bio === undefined ? {} : { bio }),
              updatedAt: new Date()
            })
          )
          .execute()
      } catch (error) {
        // Someone took the handle between the check and the write.
        const again = await database
          .selectFrom('publicProfile')
          .select('userId')
          .where('handle', '=', handle)
          .executeTakeFirst()
        if (again && again.userId !== userId) throw new PublicProfileHandleTakenError()
        throw error
      }
      return settings(userId)
    },

    /**
     * Makes a workspace public on this administrator's profile, taking it off any other's, or
     * makes it private again.
     */
    async publishWorkspace(userId: string, workspaceId: string, published: boolean) {
      const role = await workspaceRole(database, userId, workspaceId)
      if (!role) throw new DocumentNotFoundError()
      if (role !== 'admin') throw new PublicProfileForbiddenError()
      if (published && !(await guestsMayView(workspaceId, userId))) {
        throw new PublicProfileForbiddenError()
      }
      await database
        .updateTable('workspace')
        .set({
          publicAt: published ? new Date() : null,
          publicBy: published ? userId : null,
          updatedAt: new Date()
        })
        .where('id', '=', workspaceId)
        .execute()
      return settings(userId)
    },

    /** What anyone sees at `/u/<handle>`, or null when no profile has it. */
    async publicProfile(handle: string): Promise<PublicProfile | null> {
      const profile = await database
        .selectFrom('publicProfile')
        .innerJoin('user', 'user.id', 'publicProfile.userId')
        .select([
          'publicProfile.userId',
          'publicProfile.handle',
          'publicProfile.bio',
          'user.name',
          'user.image'
        ])
        .where('publicProfile.handle', '=', handle.toLowerCase())
        .executeTakeFirst()
      if (!profile || !(await accountActive(profile.userId))) return null
      const listed = (await adminWorkspaces(profile.userId)).filter((workspace) =>
        listedBy(workspace, profile.userId)
      )
      const open = []
      for (const workspace of listed) {
        if (await guestsMayView(workspace.id)) open.push(workspace)
      }
      const documents =
        open.length === 0
          ? []
          : await database
              .selectFrom('document')
              .select(['id', 'workspaceId', 'name', 'updatedAt'])
              .where(
                'workspaceId',
                'in',
                open.map((workspace) => workspace.id)
              )
              .where('deletedAt', 'is', null)
              .where('currentRevisionId', 'is not', null)
              .orderBy('updatedAt', 'desc')
              .execute()
      const byWorkspace = groupBy(documents, (document) => document.workspaceId)
      const workspaces: PublicWorkspace[] = open.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        documents: (byWorkspace[workspace.id] ?? []).map((document) => ({
          id: document.id,
          name: document.name,
          updatedAt: new Date(document.updatedAt).toISOString()
        }))
      }))
      return {
        handle: profile.handle,
        name: profile.name,
        image: profile.image ?? null,
        bio: profile.bio,
        workspaces
      }
    },

    /** Lets anyone in to a document of a public workspace; throws for any other document. */
    async requirePublicDocument(documentId: string): Promise<void> {
      const document = await database
        .selectFrom('document')
        .innerJoin('workspace', 'workspace.id', 'document.workspaceId')
        .select(['document.workspaceId', 'workspace.publicBy'])
        .where('document.id', '=', documentId)
        .where('document.deletedAt', 'is', null)
        .where('workspace.publicAt', 'is not', null)
        .executeTakeFirst()
      const publisher = document?.publicBy
      if (
        !document ||
        !publisher ||
        (await workspaceRole(database, publisher, document.workspaceId)) !== 'admin' ||
        !(await accountActive(publisher)) ||
        !(await guestsMayView(document.workspaceId))
      ) {
        throw new DocumentNotFoundError()
      }
    }
  }
}

export type PublicProfileService = ReturnType<typeof createPublicProfileService>

/** Whether `userId`'s profile lists the workspace: it is public, and they made it so. */
function listedBy(
  workspace: { publicAt: Date | null; publicBy: string | null },
  userId: string
): boolean {
  return workspace.publicAt !== null && workspace.publicBy === userId
}
