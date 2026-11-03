import { describe, expect, test } from 'bun:test'

import { createSavingCloudApp, OWNER } from '#cloud-tests/helpers/app'
import { responseJSON } from '#cloud-tests/helpers/response'
import { publicProfileSchema, publicProfileSettingsSchema } from '#cloud/contract'
import { CLOUD_FEATURE_KEYS } from '#cloud/server'
import * as v from 'valibot'

const settingsSchema = v.object({ profile: publicProfileSettingsSchema })
const profileSchema = v.object({ profile: publicProfileSchema })
const downloadSchema = v.object({ document: v.object({ revisionId: v.string() }) })

describe('public profiles', () => {
  test('list the workspaces their owner made public, for anyone to open', async () => {
    const context = await createSavingCloudApp()
    try {
      const revision = await context.save()
      const claimed = await responseJSON(
        await context.request('/profile', {
          method: 'PUT',
          json: { handle: 'Ada-Studio', bio: 'Posters and type.' }
        }),
        settingsSchema
      )
      expect(claimed.profile).toEqual({
        handle: 'ada-studio',
        bio: 'Posters and type.',
        workspaces: [{ id: context.workspaceId, name: 'Studio', public: false }]
      })

      context.session.actor = null
      const empty = await responseJSON(
        await context.request('/public/profiles/ada-studio'),
        profileSchema
      )
      expect(empty.profile).toMatchObject({ name: OWNER.name, workspaces: [] })
      const closed = await context.request(`/public/documents/${context.documentId}/document`, {
        method: 'POST'
      })
      expect(closed.status).toBe(404)

      context.session.actor = OWNER
      const published = await responseJSON(
        await context.request(`/workspaces/${context.workspaceId}/public`, {
          method: 'PUT',
          json: { public: true }
        }),
        settingsSchema
      )
      expect(published.profile.workspaces[0]?.public).toBe(true)

      context.session.actor = null
      const listed = await responseJSON(
        await context.request('/public/profiles/ADA-STUDIO'),
        profileSchema
      )
      expect(listed.profile.workspaces).toEqual([
        {
          id: context.workspaceId,
          name: 'Studio',
          slug: expect.any(String),
          documents: [{ id: context.documentId, name: 'Poster', updatedAt: expect.any(String) }]
        }
      ])
      const opened = await responseJSON(
        await context.request(`/public/documents/${context.documentId}/document`, {
          method: 'POST'
        }),
        downloadSchema
      )
      expect(opened.document.revisionId).toBe(revision)
      expect((await context.request('/public/profiles/nobody-here')).status).toBe(404)
    } finally {
      await context.runtime.close()
    }
  })

  test('keep handles unique, and removing a handle removes the profile', async () => {
    const context = await createSavingCloudApp()
    try {
      const someone = crypto.randomUUID()
      await context.runtime.database
        .insertInto('user')
        .values({ id: someone, name: 'Grace', email: 'grace@example.com', emailVerified: true })
        .execute()
      await context.runtime.database
        .insertInto('publicProfile')
        .values({ userId: someone, handle: 'taken', bio: null })
        .execute()
      // A deleted account's handle is free again.
      await context.runtime.database
        .insertInto('publicProfile')
        .values({ userId: crypto.randomUUID(), handle: 'left', bio: null })
        .execute()
      expect(
        (await context.request('/profile', { method: 'PUT', json: { handle: 'left' } })).status
      ).toBe(200)
      const clash = await context.request('/profile', { method: 'PUT', json: { handle: 'taken' } })
      expect(clash.status).toBe(409)
      const invalid = await context.request('/profile', { method: 'PUT', json: { handle: 'a b' } })
      expect(invalid.status).toBe(400)
      await context.request('/profile', { method: 'PUT', json: { handle: 'mine' } })
      const removed = await responseJSON(
        await context.request('/profile', { method: 'PUT', json: { handle: null } }),
        settingsSchema
      )
      expect(removed.profile.handle).toBeNull()
      context.session.actor = null
      expect((await context.request('/public/profiles/mine')).status).toBe(404)
    } finally {
      await context.runtime.close()
    }
  })

  test('list a workspace only on the profile of the administrator who published it', async () => {
    const context = await createSavingCloudApp()
    try {
      await context.save()
      const coAdmin = { userId: crypto.randomUUID(), email: 'grace@example.com', name: 'Grace' }
      await context.runtime.database
        .insertInto('user')
        .values({ id: coAdmin.userId, name: 'Grace', email: coAdmin.email, emailVerified: true })
        .execute()
      await context.runtime.database
        .insertInto('workspaceMember')
        .values({ workspaceId: context.workspaceId, userId: coAdmin.userId, role: 'admin' })
        .execute()
      await context.request('/profile', { method: 'PUT', json: { handle: 'ada' } })
      await context.request(`/workspaces/${context.workspaceId}/public`, {
        method: 'PUT',
        json: { public: true }
      })
      context.session.actor = coAdmin
      const theirs = await responseJSON(
        await context.request('/profile', { method: 'PUT', json: { handle: 'grace' } }),
        settingsSchema
      )
      expect(theirs.profile.workspaces[0]?.public).toBe(false)

      context.session.actor = null
      const grace = await responseJSON(
        await context.request('/public/profiles/grace'),
        profileSchema
      )
      expect(grace.profile.workspaces).toEqual([])
      const ada = await responseJSON(await context.request('/public/profiles/ada'), profileSchema)
      expect(ada.profile.workspaces.map((workspace) => workspace.id)).toEqual([context.workspaceId])
    } finally {
      await context.runtime.close()
    }
  })

  test('go dark with a banned account, files included', async () => {
    const context = await createSavingCloudApp()
    try {
      await context.save()
      await context.request('/profile', { method: 'PUT', json: { handle: 'ada' } })
      await context.request(`/workspaces/${context.workspaceId}/public`, {
        method: 'PUT',
        json: { public: true }
      })
      await context.runtime.database
        .updateTable('user')
        .set({ banned: true })
        .where('id', '=', OWNER.userId)
        .execute()
      context.session.actor = null
      expect((await context.request('/public/profiles/ada')).status).toBe(404)
      const download = await context.request(`/public/documents/${context.documentId}/document`, {
        method: 'POST'
      })
      expect(download.status).toBe(404)
    } finally {
      await context.runtime.close()
    }
  })

  test('only administrators publish, and only where guests may view', async () => {
    const context = await createSavingCloudApp({ plan: { [CLOUD_FEATURE_KEYS.guestView]: false } })
    try {
      const refused = await context.request(`/workspaces/${context.workspaceId}/public`, {
        method: 'PUT',
        json: { public: true }
      })
      expect(refused.status).toBe(403)
      context.session.actor = { userId: crypto.randomUUID(), email: 'b@example.com', name: 'B' }
      const stranger = await context.request(`/workspaces/${context.workspaceId}/public`, {
        method: 'PUT',
        json: { public: true }
      })
      expect(stranger.status).toBe(404)
    } finally {
      await context.runtime.close()
    }
  })
})
