import { shallowRef, watch } from 'vue'

import type { DocumentPermission } from '@open-pencil/cloud/contract'

import { saveExportedFile } from '@/app/document/export/files'
import { downloadBlob } from '@/app/document/io/browser'
import type { EditorStore } from '@/app/editor/session'
import { openFileInNewTab, allTabs, getTabForStore } from '@/app/tabs'

/**
 * A tab someone opened from a Cloud link they do not belong to: a document shared by link, a
 * snapshot of one, or one a public profile lists. Each offers the document as a `.fig` download.
 */
export type SharedLinkTab = {
  kind: 'live' | 'snapshot' | 'public'
  permission: DocumentPermission
  name: string
  /** The file to download: the snapshot's own bytes, or the document as its server holds it now. */
  file(): Promise<Uint8Array>
}

/** Tabs opened from links, for the bar that says so and offers the download. */
export const sharedLinkTabs = shallowRef<ReadonlyMap<EditorStore, SharedLinkTab>>(new Map())

function forget(store: EditorStore) {
  const next = new Map(sharedLinkTabs.value)
  next.delete(store)
  sharedLinkTabs.value = next
}

/** Remembers a tab opened from a link until it closes. */
function rememberSharedLinkTab(store: EditorStore, tab: SharedLinkTab): void {
  sharedLinkTabs.value = new Map(sharedLinkTabs.value).set(store, tab)
  const stop = watch(allTabs, () => {
    if (getTabForStore(store)) return
    forget(store)
    stop()
  })
}

/**
 * Opens a downloaded document in a tab of its own that never saves anywhere. Only a live link that
 * lets people edit opens editable; its room then carries the edits, and a room joined to comment
 * lets the Comment tool back in.
 */
export async function openSharedFileTab(
  bytes: Uint8Array,
  tab: SharedLinkTab
): Promise<EditorStore> {
  const store = await openFileInNewTab(
    new File([Uint8Array.from(bytes)], `${tab.name}.fig`, { type: 'application/octet-stream' })
  )
  if (tab.kind !== 'live' || tab.permission !== 'edit') store.setReadOnly(true)
  rememberSharedLinkTab(store, tab)
  return store
}

/** Saves the tab's shared document as a `.fig` file; false when the person cancelled. */
export async function downloadSharedLinkTab(store: EditorStore): Promise<boolean> {
  const tab = sharedLinkTabs.value.get(store)
  if (!tab) return false
  const bytes = await tab.file()
  return saveExportedFile(
    bytes,
    `${tab.name}.fig`,
    'Figma',
    '.fig',
    'application/octet-stream',
    downloadBlob
  )
}
