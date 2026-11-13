import { describe, expect, test } from 'bun:test'

import { claimChanges, createDocumentClaimQueue } from '@/app/window/documents'

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

  // GY-PM-4: a rejected claim previously left the promise chain rejected, so no later tab in that
  // window was ever claimed.
  test('a refused claim is retried and does not stop the paths after it', async () => {
    const sent: string[] = []
    let refuse = true
    const queue = createDocumentClaimQueue({
      claim: async (path) => {
        if (refuse) throw new Error('not delivered')
        sent.push(`claim:${path}`)
      },
      release: async (path) => {
        sent.push(`release:${path}`)
      }
    })

    await queue.update(['/work/a.pen'])
    expect(sent).toEqual([])

    refuse = false
    await queue.update(['/work/a.pen', '/work/b.pen'])
    expect(sent).toEqual(['claim:/work/a.pen', 'claim:/work/b.pen'])

    await queue.update(['/work/a.pen'])
    expect(sent).toEqual(['claim:/work/a.pen', 'claim:/work/b.pen', 'release:/work/b.pen'])
  })
})
