import { describe, expect, test } from 'bun:test'

import { CLOUD_FEATURE_KEYS, seedSharing, sharingWithPolicy } from '#cloud-tests/helpers/sharing'
import { resolveDocumentAccess } from '#cloud/server/documents/access'

describe('can comment', () => {
  test('lets guests who may view follow comment links', async () => {
    const context = await seedSharing()
    try {
      const sharing = sharingWithPolicy(context, {
        [CLOUD_FEATURE_KEYS.links]: true,
        [CLOUD_FEATURE_KEYS.guestView]: true,
        [CLOUD_FEATURE_KEYS.guestEdit]: false
      })
      const capability = await sharing.createShare('owner', context.documentId, {
        permission: 'comment'
      })
      expect(capability.share).toMatchObject({ permission: 'comment', revisionId: null })
      expect(
        await sharing.resolveShare(capability.share.id, { secret: capability.secret })
      ).toMatchObject({ permission: 'comment', revisionId: null, principal: { kind: 'guest' } })
    } finally {
      await context.runtime.close()
    }
  })

  test('grants and invitations give comment access, short of managing sharing', async () => {
    const context = await seedSharing()
    try {
      await context.sharing.putGrant('owner', context.documentId, 'commenter', {
        permission: 'comment'
      })
      expect(
        await resolveDocumentAccess(context.runtime.database, 'commenter', context.documentId)
      ).toEqual({ permission: 'comment', canManageSharing: false, sources: ['direct-grant'] })
      // A workspace viewer granted comment access comments.
      await context.sharing.putGrant('owner', context.documentId, 'viewer', {
        permission: 'comment'
      })
      expect(
        (await resolveDocumentAccess(context.runtime.database, 'viewer', context.documentId))
          ?.permission
      ).toBe('comment')
      const invitation = await context.sharing.createInvitation('owner', context.documentId, {
        email: 'reviewer@example.com',
        permission: 'comment'
      })
      expect(invitation.invitation.permission).toBe('comment')
    } finally {
      await context.runtime.close()
    }
  })
})
