import { createCloudAPIClient, type CloudAPIClient } from '@pairdraw/cloud/client'

import { usePortal } from './context'

/** The server's API for public profiles, under the session this page shares with the server. */
export function usePublicProfileAPI(): Pick<
  CloudAPIClient,
  'getPublicProfile' | 'getPublicProfileSettings' | 'updatePublicProfile' | 'publishWorkspace'
> {
  return createCloudAPIClient(usePortal().discovery.apiURL)
}
