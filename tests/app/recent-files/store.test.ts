import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import {
  forgetRecentDocuments,
  readStoredRecentDocuments,
  recentDocuments,
  rememberRecentFile
} from '@/app/recent-files'

let before: typeof recentDocuments.value

beforeEach(() => {
  // Recent files live in shared storage; each test starts from none and leaves them as it found them.
  before = recentDocuments.value
  recentDocuments.value = []
})

afterEach(() => {
  recentDocuments.value = before
})

describe('reading kept recent files', () => {
  test('dates an entry kept before creation dates by its last use', () => {
    const [document] = readStoredRecentDocuments(
      JSON.stringify([
        {
          id: 'local:/a.fig',
          kind: 'local',
          path: '/a.fig',
          name: 'a.fig',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ])
    )
    expect(document?.createdAt).toBe('2026-01-01T00:00:00.000Z')
  })

  test('keeps a recorded creation date', () => {
    const [document] = readStoredRecentDocuments(
      JSON.stringify([
        {
          id: 'storage:s3:doc',
          kind: 'storage',
          providerId: 's3',
          documentId: 'doc',
          name: 'Doc',
          updatedAt: '2026-02-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z'
        }
      ])
    )
    expect(document?.createdAt).toBe('2026-01-01T00:00:00.000Z')
  })

  test('drops entries it cannot read and keeps the rest', () => {
    const documents = readStoredRecentDocuments(
      JSON.stringify([
        { id: 'broken', kind: 'local' },
        { id: 'local:/b.fig', kind: 'local', path: '/b.fig', name: 'b.fig', updatedAt: 'x' }
      ])
    )
    expect(documents.map((document) => document.id)).toEqual(['local:/b.fig'])
  })

  test('reads malformed storage as no recent files', () => {
    expect(readStoredRecentDocuments('{not json')).toEqual([])
    expect(readStoredRecentDocuments('{"a":1}')).toEqual([])
  })
})

describe('remembering recent files', () => {
  test('a file used again moves first and keeps the date it was first added', async () => {
    rememberRecentFile('/a.fig')
    const added = recentDocuments.value[0]?.createdAt
    await Bun.sleep(2)
    rememberRecentFile('/b.fig')
    await Bun.sleep(2)
    rememberRecentFile('/a.fig')

    const [first, second] = recentDocuments.value
    expect(first?.id).toBe('local:/a.fig')
    expect(first?.createdAt).toBe(added)
    expect(first?.updatedAt).not.toBe(added)
    expect(second?.id).toBe('local:/b.fig')
  })

  test('forgetting several files removes only those', () => {
    rememberRecentFile('/a.fig')
    rememberRecentFile('/b.fig')
    rememberRecentFile('/c.fig')
    forgetRecentDocuments(['local:/a.fig', 'local:/c.fig'])
    expect(recentDocuments.value.map((document) => document.id)).toEqual(['local:/b.fig'])
  })
})
