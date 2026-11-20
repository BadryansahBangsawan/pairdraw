import { signOutFromCloud } from '@pairdraw/cloud/client'
import type { CloudDiscovery } from '@pairdraw/cloud/contract'

import { leaveAfterSignOut } from '@/app/cloud-portal/site'
import { IS_CLOUD_SITE } from '@/constants'

import { isCloudSiteServer, rememberCloudAccount } from '../servers/store'
import { cloudServerFetch, forgetCloudConnection } from './connection'
import { forgetCloudAccountCopies } from './forget'
import { clearCloudSessionToken } from './token'

export type CloudSignOutDependencies = {
  revoke: typeof signOutFromCloud
  clear(serverId: string): Promise<void>
}

const defaults: CloudSignOutDependencies = {
  revoke: signOutFromCloud,
  clear: clearCloudSessionToken
}

/**
 * Ends the session on the server first, so a failed sign-out keeps the token to try again
 * rather than leaving a live session behind, then forgets it here. Signing out of the server
 * that serves this editor leaves it as a visit without an account would (`leaveAfterSignOut`).
 */
export async function signOutOfCloud(
  serverId: string,
  discovery: CloudDiscovery,
  dependencies: CloudSignOutDependencies = defaults
): Promise<void> {
  await dependencies.revoke(discovery, { fetch: cloudServerFetch(serverId) })
  await dependencies.clear(serverId)
  // What this device kept of the account goes too; a copy that cannot be removed only warns.
  await forgetCloudAccountCopies(serverId).catch((error: unknown) => {
    console.warn('[Cloud] Could not forget the account on this device', error)
  })
  rememberCloudAccount(serverId, null)
  forgetCloudConnection(serverId)
  if (IS_CLOUD_SITE && isCloudSiteServer(serverId)) leaveAfterSignOut(discovery.localEditor)
}
