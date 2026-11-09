import { describe, expect, test } from 'bun:test'

import type { DocumentSourceIdentity } from '@/app/document/io/types'
import { recoverySnapshotMeta } from '@/app/document/recovery/meta'
import type { StoredSourceIdentity } from '@/app/document/recovery/types'
import { storedIdentityMatchesFile } from '@/app/tabs/open/identity'

import { asDouble } from '#tests/helpers/doubles'

describe('storedIdentityMatchesFile', () => {
  const pathStored: StoredSourceIdentity = { handleName: null, path: '/designs/landing.fig' }
  const nameStored: StoredSourceIdentity = { handleName: 'landing.fig', path: null }

  test('matches the same path and rejects a different one', () => {
    const same: DocumentSourceIdentity = { handle: null, path: '/designs/landing.fig' }
    const different: DocumentSourceIdentity = { handle: null, path: '/designs/other.fig' }
    expect(storedIdentityMatchesFile(pathStored, same)).toBe(true)
    expect(storedIdentityMatchesFile(pathStored, different)).toBe(false)
  })

  test('matches the same handle name and rejects a different one', () => {
    const same = asDouble<FileSystemFileHandle>({ kind: 'file', name: 'landing.fig' })
    const different = asDouble<FileSystemFileHandle>({ kind: 'file', name: 'other.fig' })
    expect(storedIdentityMatchesFile(nameStored, { handle: same, path: null })).toBe(true)
    expect(storedIdentityMatchesFile(nameStored, { handle: different, path: null })).toBe(false)
  })

  test('matches nothing when a path and a handle are both missing', () => {
    const neither = asDouble<FileSystemHandle>({ kind: 'file', name: 'something' })
    expect(
      storedIdentityMatchesFile({ handleName: null, path: null }, { handle: null, path: null })
    ).toBe(false)
    expect(
      storedIdentityMatchesFile(nameStored, {
        handle: asDouble<FileSystemFileHandle>({ kind: 'file', name: 'x.fig' }),
        path: null
      })
    ).toBe(false)
    expect(
      storedIdentityMatchesFile(pathStored, {
        handle: asDouble<FileSystemFileHandle>({ kind: 'file', name: 'landing.fig' }),
        path: null
      })
    ).toBe(false)
    expect(neither.name).toBe('something')
  })

  test('a stored source with a path does not match a live handle with no path', () => {
    const withHandle: DocumentSourceIdentity = {
      handle: asDouble<FileSystemFileHandle>({ kind: 'file', name: '/designs/landing.fig' }),
      path: null
    }
    expect(storedIdentityMatchesFile(pathStored, withHandle)).toBe(false)
  })
})

describe('recoverySnapshotMeta', () => {
  test('a live handle stores only its name and path, never the handle', () => {
    const handle = asDouble<FileSystemFileHandle>({ kind: 'file', name: 'landing.fig' })
    const meta = recoverySnapshotMeta({
      id: 'backup-1',
      documentName: 'Landing',
      figBytes: new Uint8Array([1, 2, 3]),
      source: { handle, path: null }
    })
    expect(meta.source).toEqual({ handleName: 'landing.fig', path: null })
    expect('handle' in (meta.source ?? {})).toBe(false)
  })

  test('a stored source stays as it was', () => {
    const meta = recoverySnapshotMeta({
      id: 'backup-2',
      documentName: 'Landing',
      figBytes: new Uint8Array([1]),
      source: { handleName: 'landing.fig', path: null }
    })
    expect(meta.source).toEqual({ handleName: 'landing.fig', path: null })
  })
})
