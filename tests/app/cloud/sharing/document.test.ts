import { describe, expect, test } from 'bun:test'

import type { CloudAPIClient } from '@open-pencil/cloud/client'

import {
  readCloudSharing,
  shareCloudSnapshot,
  type cloudShareTarget
} from '@/app/cloud/sharing/document'

import { asDouble } from '#tests/helpers/doubles'

type ShareTarget = NonNullable<ReturnType<typeof cloudShareTarget>>
type Shares = Awaited<ReturnType<CloudAPIClient['listDocumentShares']>>

const PINNED = '0b9d9a43-8f43-4f31-9a39-6a4d8fd2b001'
const LATEST = '0b9d9a43-8f43-4f31-9a39-6a4d8fd2b002'

/**
 * A document at revision `current` (undefined where the server does not say), with `shares`, for
 * someone who manages it.
 */
function target(
  shares: Shares,
  current: string | null | undefined,
  client: Partial<CloudAPIClient> = {}
) {
  return asDouble<ShareTarget>({
    documentId: 'doc',
    workspaceId: 'studio',
    accountId: 'ada',
    server: { id: 'server', url: 'https://cloud.example.com' },
    client: {
      getDocumentAccess: async () =>
        asDouble({ canManageSharing: true, currentRevisionId: current }),
      listDocumentGrants: async () => [],
      listDocumentInvitations: async () => [],
      getWorkspaceEntitlements: async () => asDouble({ features: { links: true } }),
      listDocumentShares: async () => shares,
      listDocuments: async () => {
        throw new Error('Sharing reads the one document, not its workspace’s list')
      },
      ...client
    }
  })
}

const snapshot = (revisionId: string) =>
  asDouble<Shares>([{ id: 'snap', permission: 'view', revokedAt: null, revisionId }])

describe('a Cloud document’s snapshot link', () => {
  test('waits for a first save, then offers one, and says when it falls behind', async () => {
    expect((await readCloudSharing(target([], null))).snapshot).toEqual({ state: 'unsaved' })
    expect((await readCloudSharing(target([], LATEST))).snapshot).toEqual({ state: 'none' })
    const behind = await readCloudSharing(target(snapshot(PINNED), LATEST))
    expect(behind.snapshot).toMatchObject({ state: 'shared', behind: true })
    // A snapshot is not the live link, which stays restricted.
    expect(behind.link).toEqual({ access: 'restricted' })
    const current = await readCloudSharing(target(snapshot(LATEST), LATEST))
    expect(current.snapshot).toMatchObject({ state: 'shared', behind: false })
  })

  test('offers no snapshot where the server does not say which revision the document holds', async () => {
    expect((await readCloudSharing(target([], undefined))).snapshot).toEqual({
      state: 'unavailable'
    })
    const kept = await readCloudSharing(target(snapshot(PINNED), undefined))
    expect(kept.snapshot).toMatchObject({ state: 'shared', behind: false })
  })

  test('updates the snapshot it has rather than making another', async () => {
    const updates: unknown[] = []
    const creates: unknown[] = []
    await shareCloudSnapshot(
      target(snapshot(PINNED), LATEST, {
        updateDocumentShare: async (_documentId, shareId, input) => {
          updates.push({ shareId, input })
          return asDouble({})
        },
        createDocumentShare: async (_documentId, input) => {
          creates.push(input)
          return asDouble({})
        }
      })
    )
    expect(updates).toEqual([{ shareId: 'snap', input: { snapshot: 'current' } }])
    expect(creates).toEqual([])
  })
})
