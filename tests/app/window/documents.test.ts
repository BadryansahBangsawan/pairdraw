import { describe, expect, test } from 'bun:test'

import { claimChanges } from '@/app/window/documents'

describe('open-document registry claims', () => {
  test('a tab with a file claims its path, and closing it releases only that path', () => {
    expect(claimChanges(new Set(['/work/a.pen']), ['/work/a.pen', '/work/b.pen'])).toEqual({
      added: ['/work/b.pen'],
      removed: []
    })
    expect(claimChanges(new Set(['/work/a.pen', '/work/b.pen']), ['/work/a.pen'])).toEqual({
      added: [],
      removed: ['/work/b.pen']
    })
  })

  test('an unchanged set of paths sends nothing to the shell', () => {
    expect(claimChanges(new Set(['/work/a.pen']), ['/work/a.pen'])).toEqual({
      added: [],
      removed: []
    })
  })
})
