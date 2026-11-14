export {
  activeStorageProviderID,
  readStoragePreferences,
  storagePreferencesComplete,
  writeStoragePreference
} from './preferences'

export { storageProviderRegistry } from './providers'
export { defineStorageProvider, StorageProviderRegistry } from './registry'

export { StorageRevisionConflictError, StorageUnavailableError } from './errors'
export {
  DEFAULT_STORAGE_PROFILE,
  sameStorageDocument,
  sameStorageLocation,
  storageLocationOf,
  storageProfileId
} from './location'
export {
  createActiveStorageAdapter,
  createStorageAdapter,
  openStorageAdapter,
  resetStorageProviderRegistryForTests,
  isStorageConfigured,
  storageCredentialRefs,
  storageCredentialStatuses
} from './runtime'
export type {
  StorageAdapter,
  StorageDocument,
  StorageDocumentBinding,
  StorageLocation,
  LibraryObjectStore,
  StorageProviderRuntime
} from './types'
