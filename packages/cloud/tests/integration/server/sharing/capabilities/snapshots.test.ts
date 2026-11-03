import { describe, expect, test } from 'bun:test'

import { createSavingCloudApp, OWNER } from '#cloud-tests/helpers/app'
import { responseJSON } from '#cloud-tests/helpers/response'
import { documentShareSchema } from '#cloud/contract'
import { createRevisionCompactionService } from '#cloud/server'
import * as v from 'valibot'

const DAY_MS = 24 * 60 * 60_000

const capabilitySchema = v.object({ share: documentShareSchema, secret: v.string() })
const sharedSchema = v.object({
  resolution: v.object({ permission: v.string(), revisionId: v.nullable(v.string()) }),
  document: v.object({ revisionId: v.string() })
})

describe('snapshot links', () => {
  test('show the revision they pin, view-only, until Update snapshot pins another', async () => {
    const context = await createSavingCloudApp()
    try {
      const first = await context.save()
      const created = await responseJSON(
        await context.request(`/documents/${context.documentId}/shares`, {
          method: 'POST',
          json: { permission: 'view', snapshot: 'current' }
        }),
        capabilitySchema
      )
      expect(created.share).toMatchObject({ permission: 'view', revisionId: first })
      const second = await context.save()

      // Someone signed out follows the link and gets the revision it pins, not the latest.
      context.session.actor = null
      const open = () =>
        context.request(`/shares/${created.share.id}/document`, {
          method: 'POST',
          json: { secret: created.secret, guestName: 'Visitor' }
        })
      const shared = await responseJSON(await open(), sharedSchema)
      expect(shared.resolution).toEqual({ permission: 'view', revisionId: first })
      expect(shared.document.revisionId).toBe(first)
      // A snapshot has no room to join.
      const ticket = await context.request(`/shares/${created.share.id}/collaboration-ticket`, {
        method: 'POST',
        json: { secret: created.secret }
      })
      expect(ticket.status).toBe(404)

      context.session.actor = OWNER
      const updated = await responseJSON(
        await context.request(`/documents/${context.documentId}/shares/${created.share.id}`, {
          method: 'PATCH',
          json: { snapshot: 'current' }
        }),
        v.object({ share: documentShareSchema })
      )
      expect(updated.share.revisionId).toBe(second)
      expect((await responseJSON(await open(), sharedSchema)).document.revisionId).toBe(second)
    } finally {
      await context.runtime.close()
    }
  })

  test('stay view-only, and live links take no revision', async () => {
    const context = await createSavingCloudApp()
    try {
      const revision = await context.save()
      const shares = `/documents/${context.documentId}/shares`
      const editable = await context.request(shares, {
        method: 'POST',
        json: { permission: 'edit', snapshot: revision }
      })
      expect(editable.status).toBe(400)
      const snapshot = await responseJSON(
        await context.request(shares, {
          method: 'POST',
          json: { permission: 'view', snapshot: revision }
        }),
        capabilitySchema
      )
      const promote = await context.request(`${shares}/${snapshot.share.id}`, {
        method: 'PATCH',
        json: { permission: 'comment' }
      })
      expect(promote.status).toBe(400)
      const live = await responseJSON(
        await context.request(shares, { method: 'POST', json: { permission: 'comment' } }),
        capabilitySchema
      )
      expect(live.share).toMatchObject({ permission: 'comment', revisionId: null })
      const pin = await context.request(`${shares}/${live.share.id}`, {
        method: 'PATCH',
        json: { snapshot: 'current' }
      })
      expect(pin.status).toBe(400)
      // A revision of another document is no snapshot of this one.
      const stranger = await context.request(shares, {
        method: 'POST',
        json: { permission: 'view', snapshot: crypto.randomUUID() }
      })
      expect(stranger.status).toBe(400)
    } finally {
      await context.runtime.close()
    }
  })

  test('keep their revision through compaction, and revoking one leaves the room be', async () => {
    const context = await createSavingCloudApp()
    try {
      await context.save()
      const pinned = await context.save()
      await context.save()
      const snapshot = await responseJSON(
        await context.request(`/documents/${context.documentId}/shares`, {
          method: 'POST',
          json: { permission: 'view', snapshot: pinned }
        }),
        capabilitySchema
      )
      for (const row of await context.runtime.database
        .selectFrom('documentRevision')
        .select(['id', 'createdAt'])
        .execute()) {
        await context.runtime.database
          .updateTable('documentRevision')
          .set({ createdAt: new Date(row.createdAt.getTime() - 2 * DAY_MS) })
          .where('id', '=', row.id)
          .execute()
      }
      await createRevisionCompactionService(
        context.runtime.database,
        context.objects.store
      ).compactRevisions({ batchSize: 100, graceMs: DAY_MS })
      const kept = await context.runtime.database
        .selectFrom('documentRevision')
        .select('id')
        .where('id', '=', pinned)
        .executeTakeFirst()
      expect(kept?.id).toBe(pinned)

      const epoch = async () =>
        (
          await context.runtime.database
            .selectFrom('document')
            .select('collaborationEpoch')
            .where('id', '=', context.documentId)
            .executeTakeFirstOrThrow()
        ).collaborationEpoch
      const before = await epoch()
      const revoked = await context.request(
        `/documents/${context.documentId}/shares/${snapshot.share.id}`,
        { method: 'DELETE' }
      )
      expect(revoked.status).toBe(204)
      expect(await epoch()).toBe(before)
    } finally {
      await context.runtime.close()
    }
  })
})
