import { describe, expect, test } from 'bun:test'

import type { RecentDocument } from '@/app/recent-files'
import { isRecentFilesSort, sortRecentDocuments } from '@/app/recent-files/sort'

function local(name: string, updatedAt: string, createdAt: string): RecentDocument {
  return { id: `local:/${name}`, kind: 'local', path: `/${name}`, name, updatedAt, createdAt }
}

const alpha = local('Alpha.fig', '2026-03-01T00:00:00.000Z', '2026-01-03T00:00:00.000Z')
const beta = local('beta 10.fig', '2026-03-03T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
const gamma = local('beta 9.fig', '2026-03-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z')
const documents = [alpha, beta, gamma]
const names = (sorted: readonly RecentDocument[]) => sorted.map((document) => document.name)

describe('sorting recent files', () => {
  test('by last used puts the most recently used first', () => {
    expect(names(sortRecentDocuments(documents, 'last-used', 'en'))).toEqual([
      beta.name,
      gamma.name,
      alpha.name
    ])
  })

  test('by created puts the most recently added first', () => {
    expect(names(sortRecentDocuments(documents, 'created', 'en'))).toEqual([
      alpha.name,
      gamma.name,
      beta.name
    ])
  })

  test('by name ignores case and orders numbers by value', () => {
    expect(names(sortRecentDocuments(documents, 'name', 'en'))).toEqual([
      alpha.name,
      gamma.name,
      beta.name
    ])
  })

  test('keeps the incoming order for ties and unreadable dates, without changing the input', () => {
    const undated = local('Undated.fig', 'not a date', 'not a date')
    const tied = local('Tied.fig', beta.updatedAt, beta.createdAt)
    const input = [undated, beta, tied]
    expect(sortRecentDocuments(input, 'last-used', 'en')).toEqual([beta, tied, undated])
    expect(input).toEqual([undated, beta, tied])
  })

  test('recognizes only the orders Home offers', () => {
    expect(isRecentFilesSort('name')).toBe(true)
    expect(isRecentFilesSort('size')).toBe(false)
    expect(isRecentFilesSort(undefined)).toBe(false)
  })
})
