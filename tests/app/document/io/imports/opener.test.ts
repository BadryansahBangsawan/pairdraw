import { describe, expect, test } from 'bun:test'

import { documentImportOpener } from '@/app/document/io/imports'

function failingPaths() {
  let dirnameCalls = 0
  let homeCalls = 0
  const paths = {
    dirname: async () => {
      dirnameCalls += 1
      if (dirnameCalls === 1) throw new Error('dirname down')
      return '/docs/project/screens'
    },
    homeDir: async () => {
      homeCalls += 1
      if (homeCalls === 1) throw new Error('home down')
      return '/Users/me'
    },
    isAbsolute: async () => false,
    join: async (left: string, right: string) => `${left}/${right}`,
    resolve: async (directory: string, relative: string) => `${directory}/${relative}`,
    sep: () => '/'
  }
  return {
    paths,
    dirnameCalls: () => dirnameCalls,
    homeCalls: () => homeCalls
  }
}

describe('a document import opener', () => {
  test('reads nothing beside a document when there is no desktop path API', () => {
    expect(documentImportOpener('/docs/project/screens/file.pen')).toBeUndefined()
  })

  test('tries the path API again after it rejects, so a later library import is not stuck', async () => {
    const api = failingPaths()
    const open = documentImportOpener('/docs/project/screens/file.pen', api.paths)
    if (open === undefined) throw new Error('expected an opener')
    await expect(open('lib.pen')).rejects.toThrow('dirname down')
    expect(api.dirnameCalls()).toBe(1)
    expect(await open('lib.pen')).toBeNull()
    // Once for the failed lookup, once for the retry, once to resolve the library path.
    expect(api.dirnameCalls()).toBe(3)
    expect(api.homeCalls()).toBe(2)
  })
})
