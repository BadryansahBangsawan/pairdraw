import { afterEach, beforeEach, describe, expect, test, vi } from 'bun:test'

import { recentDocuments, rememberRecentFile } from '@/app/recent-files'
import { openRecentDocument } from '@/app/recent-files/workspace'
import * as menu from '@/app/shell/menu/use'

const path = '/designs/alpha.fig'

function recentAlpha() {
  const document = recentDocuments.value.find(
    (candidate) => candidate.kind === 'local' && candidate.path === path
  )
  if (!document) throw new Error('The recent file was not remembered')
  return document
}

let before: typeof recentDocuments.value

beforeEach(() => {
  before = recentDocuments.value
  recentDocuments.value = []
  rememberRecentFile(path)
})

afterEach(() => {
  vi.restoreAllMocks()
  recentDocuments.value = before
})

describe('opening a recent file', () => {
  test('keeps the recent entry when the open was cancelled', async () => {
    vi.spyOn(menu, 'openFileFromPath').mockRejectedValue(
      new DOMException('The operation was aborted.', 'AbortError')
    )

    const document = recentAlpha()
    await expect(openRecentDocument(document)).rejects.toThrow('The operation was aborted.')
    expect(recentDocuments.value.map((entry) => entry.id)).toEqual([document.id])
  })

  test('forgets the recent entry when the file cannot be read', async () => {
    vi.spyOn(menu, 'openFileFromPath').mockRejectedValue(
      new DOMException('The file does not exist.', 'NotFoundError')
    )

    await expect(openRecentDocument(recentAlpha())).rejects.toThrow('does not exist')
    expect(recentDocuments.value).toEqual([])
  })
})
