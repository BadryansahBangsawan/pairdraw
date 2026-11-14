import type { CloudAPIClient } from '@pairdraw/cloud/client'
import {
  cloudShareURL,
  type CloudDiscovery,
  type DocumentPermission,
  type DocumentShare
} from '@pairdraw/cloud/contract'

import type { StorageDocumentBinding } from '@/app/integrations/storage/types'

import { findCloudServer, type CloudServer } from '../servers/store'
import { cloudAPIClient, cloudConnection } from '../sessions/connection'
import { clearShareSecret, readShareSecret, saveShareSecret } from './secrets'

/** Someone with access: a person granted it, or an invitation not accepted yet. */
type CloudShareMember = {
  id: string
  name: string
  email: string
  permission: DocumentPermission
  /** When a pending invitation expires. */
  pendingUntil?: string
  you?: boolean
}

export type CloudShareLink =
  | { access: 'restricted' }
  | { access: 'link'; permission: DocumentPermission; copyable: boolean }

/**
 * The document's snapshot link: none yet, none possible until the document has a saved revision
 * or where the server does not say which revision it holds, as servers before snapshot links do,
 * or one that shows the revision it pins, possibly behind what the document holds now.
 */
type CloudSnapshotLink =
  | { state: 'none' }
  | { state: 'unsaved' }
  | { state: 'unavailable' }
  | { state: 'shared'; copyable: boolean; behind: boolean }

export type CloudSharing = {
  canManage: boolean
  members: CloudShareMember[]
  link: CloudShareLink
  snapshot: CloudSnapshotLink
  /** What the workspace's plan allows for links. */
  links: CloudLinkPolicy
}

/**
 * Whether the workspace allows links at all, and whether people who are not signed in to the
 * server may follow view and edit links; people signed in may follow any link.
 */
export type CloudLinkPolicy = { allowed: boolean; guestView: boolean; guestEdit: boolean }

type Target = {
  server: CloudServer
  discovery: CloudDiscovery
  client: CloudAPIClient
  documentId: string
  workspaceId: string | null
  accountId: string | null
}

const GRANT = 'grant:'
const INVITATION = 'invitation:'

/** The server, client, and document for a Cloud binding, while signed in to its server. */
export function cloudShareTarget(binding: StorageDocumentBinding): Target | null {
  const server = binding.profileId ? findCloudServer(binding.profileId) : null
  if (!server) return null
  const connection = cloudConnection(server.id)
  if (connection.state !== 'signed-in' || !connection.discovery) return null
  return {
    server,
    discovery: connection.discovery,
    client: cloudAPIClient(server, connection.discovery),
    documentId: binding.documentId,
    workspaceId: binding.containerId ?? null,
    accountId: connection.account?.id ?? null
  }
}

/** The live link: the one share that opens the document's room. */
const activeShare = (shares: DocumentShare[]) =>
  shares.find((share) => !share.revokedAt && !share.revisionId) ?? null
/** The snapshot link: the one share that shows a pinned revision. */
const activeSnapshot = (shares: DocumentShare[]) =>
  shares.find((share) => !share.revokedAt && Boolean(share.revisionId)) ?? null

/**
 * The snapshot link, given the revision the document holds now: null before its first save, and
 * undefined where the server does not say.
 */
async function readSnapshot(
  target: Target,
  shares: DocumentShare[],
  current: string | null | undefined
): Promise<CloudSnapshotLink> {
  const snapshot = activeSnapshot(shares)
  if (!snapshot) {
    if (current === undefined) return { state: 'unavailable' }
    return current === null ? { state: 'unsaved' } : { state: 'none' }
  }
  return {
    state: 'shared',
    copyable: Boolean(await readShareSecret(target.server.id, snapshot.id)),
    behind: typeof current === 'string' && current !== snapshot.revisionId
  }
}

/** Who can open the document and whether its link is on, as this account may see it. */
export async function readCloudSharing(target: Target): Promise<CloudSharing> {
  const { client, documentId } = target
  const access = await client.getDocumentAccess(documentId)
  const closed: CloudLinkPolicy = { allowed: false, guestView: false, guestEdit: false }
  if (!access.canManageSharing) {
    return {
      canManage: false,
      members: [],
      link: { access: 'restricted' },
      snapshot: { state: 'none' },
      links: closed
    }
  }
  const [grants, invitations, shares, entitlements] = await Promise.all([
    client.listDocumentGrants(documentId),
    client.listDocumentInvitations(documentId),
    client.listDocumentShares(documentId),
    target.workspaceId
      ? client.getWorkspaceEntitlements(target.workspaceId).catch(() => null)
      : Promise.resolve(null)
  ])
  const features = entitlements?.features
  const links: CloudLinkPolicy = features
    ? { allowed: features.links, guestView: features.guestView, guestEdit: features.guestEdit }
    : closed
  const people = await Promise.all(
    grants.map(async (grant) => {
      const profile = await client.getUserProfile(documentId, grant.userId).catch(() => null)
      return {
        id: `${GRANT}${grant.userId}`,
        name: profile?.name ?? grant.userId,
        email: profile?.email ?? '',
        permission: grant.permission,
        you: grant.userId === target.accountId
      }
    })
  )
  const pending = invitations
    .filter((invitation) => !invitation.acceptedAt)
    .map((invitation) => ({
      id: `${INVITATION}${invitation.id}`,
      name: invitation.email,
      email: invitation.email,
      permission: invitation.permission,
      pendingUntil: invitation.expiresAt
    }))
  const share = activeShare(shares)
  const link: CloudShareLink = share
    ? {
        access: 'link',
        permission: share.permission,
        copyable: Boolean(await readShareSecret(target.server.id, share.id))
      }
    : { access: 'restricted' }
  const snapshot = await readSnapshot(target, shares, access.currentRevisionId)
  return { canManage: true, members: [...people, ...pending], link, snapshot, links }
}

export async function inviteToCloudDocument(
  target: Target,
  email: string,
  permission: DocumentPermission
): Promise<void> {
  await target.client.createDocumentInvitation(target.documentId, { email, permission })
}

/** Changes or removes a person's access, or withdraws an invitation. */
export async function changeCloudMember(
  target: Target,
  memberId: string,
  change: DocumentPermission | 'remove'
): Promise<void> {
  const { client, documentId } = target
  if (memberId.startsWith(INVITATION)) {
    const invitationId = memberId.slice(INVITATION.length)
    if (change === 'remove') await client.revokeDocumentInvitation(documentId, invitationId)
    return
  }
  const userId = memberId.slice(GRANT.length)
  if (change === 'remove') await client.revokeDocumentGrant(documentId, userId)
  else await client.putDocumentGrant(documentId, userId, { permission: change })
}

/**
 * Turns the link off, on with a permission, or changes its permission. A new link's secret is
 * kept on this device so the link can be copied here.
 */
export async function changeCloudLink(target: Target, link: CloudShareLink): Promise<void> {
  const { client, documentId, server } = target
  const share = activeShare(await client.listDocumentShares(documentId))
  if (link.access === 'restricted') {
    if (!share) return
    await client.revokeDocumentShare(documentId, share.id)
    await clearShareSecret(server.id, share.id)
    return
  }
  if (share) {
    await client.updateDocumentShare(documentId, share.id, { permission: link.permission })
    return
  }
  const created = await client.createDocumentShare(documentId, { permission: link.permission })
  await saveShareSecret(server.id, created.share.id, created.secret)
}

/** Replaces the link's secret, so old copies stop working and this device can copy it. */
export async function resetCloudLink(target: Target): Promise<void> {
  const { client, documentId, server } = target
  const share = activeShare(await client.listDocumentShares(documentId))
  if (!share) return
  const rotated = await client.rotateDocumentShare(documentId, share.id)
  await saveShareSecret(server.id, rotated.share.id, rotated.secret)
}

/** The link to copy, when this device has its secret. */
export async function cloudLinkURL(target: Target): Promise<string | null> {
  const share = activeShare(await target.client.listDocumentShares(target.documentId))
  if (!share) return null
  const secret = await readShareSecret(target.server.id, share.id)
  return secret ? cloudShareURL(target.server.url, share.id, secret) : null
}

/**
 * Makes the document's snapshot link to the revision it holds now, or pins the existing one to it,
 * as Update snapshot does. A new link's secret is kept on this device so it can be copied here.
 */
export async function shareCloudSnapshot(target: Target): Promise<void> {
  const { client, documentId, server } = target
  const snapshot = activeSnapshot(await client.listDocumentShares(documentId))
  if (snapshot) {
    await client.updateDocumentShare(documentId, snapshot.id, { snapshot: 'current' })
    return
  }
  const created = await client.createDocumentShare(documentId, {
    permission: 'view',
    snapshot: 'current'
  })
  await saveShareSecret(server.id, created.share.id, created.secret)
}

/** Deletes the snapshot link, so it stops opening anything. */
export async function deleteCloudSnapshot(target: Target): Promise<void> {
  const { client, documentId, server } = target
  const snapshot = activeSnapshot(await client.listDocumentShares(documentId))
  if (!snapshot) return
  await client.revokeDocumentShare(documentId, snapshot.id)
  await clearShareSecret(server.id, snapshot.id)
}

/** Replaces the snapshot link's secret, so this device can copy it and old copies stop working. */
export async function resetCloudSnapshot(target: Target): Promise<void> {
  const { client, documentId, server } = target
  const snapshot = activeSnapshot(await client.listDocumentShares(documentId))
  if (!snapshot) return
  const rotated = await client.rotateDocumentShare(documentId, snapshot.id)
  await saveShareSecret(server.id, rotated.share.id, rotated.secret)
}

/** The snapshot link to copy, when this device has its secret. */
export async function cloudSnapshotURL(target: Target): Promise<string | null> {
  const snapshot = activeSnapshot(await target.client.listDocumentShares(target.documentId))
  if (!snapshot) return null
  const secret = await readShareSecret(target.server.id, snapshot.id)
  return secret ? cloudShareURL(target.server.url, snapshot.id, secret) : null
}
