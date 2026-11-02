import type { HomeLocationView } from '@/app/home/locations'

/** A place the home tab lists documents from. */
export type HomeLocation = HomeLocationView

export type HomeCloudAccount = {
  id: string
  name: string
  email: string
  image?: string | null
  /** The Cloud server's host, such as `cloud.openpencil.dev`. */
  host: string
}

/** Where a Cloud document stands between this device and the server. */
export type CloudSyncState = 'synced' | 'uploading' | 'pending' | 'offline' | 'conflict' | 'error'

export type CloudDocumentRow = {
  id: string
  name: string
  previewURL?: string | null
  editedAt: string
  editedBy?: string
  sync: CloudSyncState
  /** Shared beyond the workspace, with people or a link. */
  shared?: boolean
  permission: 'edit' | 'view'
}
