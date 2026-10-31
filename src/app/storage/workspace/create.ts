import type { DocumentKind } from '@open-pencil/scene-graph'

import type { StorageLocation } from '@/app/integrations/storage'
import { rememberRecentStorageDocument } from '@/app/recent-files'
import { createDocumentTab, type Tab } from '@/app/tabs'

/**
 * Starts a design or a board that lives in a Cloud workspace or the storage bucket from its first
 * edit. Its tab opens at once and its first save follows.
 */
export function createStoredDocument(
  location: StorageLocation,
  kind: DocumentKind = 'design'
): Tab {
  const tab = createDocumentTab(kind)
  void saveNewDocument(tab, location)
  return tab
}

async function saveNewDocument({ store }: Tab, location: StorageLocation): Promise<void> {
  if (!(await store.saveFigFileToStorage(location))) return
  const binding = store.getStorageBinding()
  if (binding) rememberRecentStorageDocument(binding, store.state.documentName)
}
