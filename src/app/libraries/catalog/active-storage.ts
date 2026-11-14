import type { LibraryCatalog } from '@pairdraw/core/library'

import { createActiveStorageAdapter, storagePreferencesComplete } from '@/app/integrations/storage'
import { activeStorageProviderID } from '@/app/integrations/storage/preferences'
import { readLibraryCatalogSource } from '@/app/libraries/preferences'
import type { LibraryService } from '@/app/libraries/service'

import type { LibraryCatalogSource } from './routed'
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

/**
 * Reads from storage again when that is the catalog last chosen, so lists shown before the library
 * manager opens, such as Home's design systems, hold its libraries. Storage no longer set up keeps
 * the local catalog and the stored choice, for when it is set up again.
 */
export function restoreLibraryCatalogSource(
  service: Pick<LibraryService, 'catalogSource' | 'useStorageCatalog'>,
  source: LibraryCatalogSource = readLibraryCatalogSource(),
  storageCatalog: () => LibraryCatalog = activeStorageLibraryCatalog
): void {
  if (source !== 'storage' || service.catalogSource === 'storage') return
  try {
    service.useStorageCatalog(storageCatalog())
  } catch (error) {
    console.warn('[Libraries] Could not read libraries from storage', error)
  }
}
