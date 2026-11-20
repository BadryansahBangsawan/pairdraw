import type { DBSchema } from 'idb'

import { APP_DATABASE_NAMES, connectAppDatabase, defineAppDatabase } from '@/app/storage/idb'

/**
 * Where a document's linked code is on this computer, which the document never records: a path
 * on desktop, the file handle a Chromium browser granted, and whether the link was watched.
 */
export interface TokenSourceLocation {
  /** The document root's id and the link's id. */
  key: string
  path?: string
  handle?: FileSystemFileHandle
  watching: boolean
}

interface TokenSourcesDatabase extends DBSchema {
  locations: { key: string; value: TokenSourceLocation }
}

const tokenSourcesDatabase = connectAppDatabase(
  defineAppDatabase<TokenSourcesDatabase>({
    name: APP_DATABASE_NAMES.tokenSources,
    version: 1,
    callbacks: {
      upgrade(database) {
        if (!database.objectStoreNames.contains('locations'))
          database.createObjectStore('locations', { keyPath: 'key' })
      }
    }
  })
)

/**
 * Locations kept this session as well, so a document reopened in another tab finds its file even
 * where the browser cannot store a file handle, as in a private window.
 */
const sessionLocations = new Map<string, TokenSourceLocation>()

export function tokenSourceLocationKey(documentId: string, sourceId: string): string {
  return `${documentId}:${sourceId}`
}

/** The location, or undefined where none is kept or storage is unavailable. */
export async function readTokenSourceLocation(
  key: string
): Promise<TokenSourceLocation | undefined> {
  const kept = sessionLocations.get(key)
  if (kept) return kept
  try {
    return await (await tokenSourcesDatabase.open()).get('locations', key)
  } catch {
    return undefined
  }
}

/** Keeps the location; without storage the link lasts only while the document is open. */
export async function writeTokenSourceLocation(location: TokenSourceLocation): Promise<void> {
  sessionLocations.set(location.key, location)
  try {
    await (await tokenSourcesDatabase.open()).put('locations', location)
  } catch (error) {
    // Private windows and blocked storage keep no locations; the link lasts while it is open.
    console.warn('[Tokens] Could not remember where the linked file is:', error)
  }
}

export async function forgetTokenSourceLocation(key: string): Promise<void> {
  sessionLocations.delete(key)
  try {
    await (await tokenSourcesDatabase.open()).delete('locations', key)
  } catch (error) {
    console.warn('[Tokens] Could not forget where the linked file was:', error)
  }
}
