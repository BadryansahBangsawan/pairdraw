import { createActiveStorageAdapter, storagePreferencesComplete } from '@/app/integrations/storage'
import { activeStorageProviderID } from '@/app/integrations/storage/preferences'

import { StorageLibraryCatalog } from './storage'

/**
 * The library catalog of the storage set up in Settings → Storage. Throws when no storage is set
 * up or it keeps no libraries.
 */
export function activeStorageLibraryCatalog(): StorageLibraryCatalog {
  const providerId = activeStorageProviderID.value
  if (!storagePreferencesComplete(providerId)) throw new Error('Storage is not configured')
  const objects = createActiveStorageAdapter(providerId).libraryObjects
  if (!objects) throw new Error('Storage libraries are unavailable')
  return new StorageLibraryCatalog(objects)
}
