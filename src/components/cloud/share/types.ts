export type SharePermission = 'edit' | 'comment' | 'view'

export type ShareMember = {
  id: string
  name: string
  email: string
  permission: SharePermission | 'owner'
  /** An invitation not accepted yet, with when it expires. */
  pendingUntil?: string
  you?: boolean
}

export type ShareLinkState =
  | { access: 'restricted' }
  | { access: 'link'; permission: SharePermission; copyable: boolean }

/** The document's snapshot link, as the share dialog shows it (`CloudSnapshotLink`). */
export type ShareSnapshotState =
  | { state: 'none' }
  | { state: 'unsaved' }
  | { state: 'unavailable' }
  | { state: 'shared'; copyable: boolean; behind: boolean }
