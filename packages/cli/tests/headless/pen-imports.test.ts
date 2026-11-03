import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { loadDocument } from '#cli/headless'

const root = await realpath(await mkdtemp(join(tmpdir(), 'pen-imports-')))
afterAll(() => rm(root, { recursive: true, force: true }))

const pen = (fields: Record<string, unknown>) => JSON.stringify({ version: '2.21', ...fields })

const library = (id: string) =>
  pen({ children: [{ id, type: 'frame', reusable: true, width: 40, height: 20 }] })

await mkdir(join(root, 'screens'), { recursive: true })
await mkdir(join(root, 'library'), { recursive: true })
await writeFile(join(root, 'library', 'ui.lib.pen'), library('button'))
await writeFile(join(root, 'screens', 'local.lib.pen'), library('chip'))
await writeFile(join(root, 'library', 'ui.json'), library('button'))
await writeFile(
  join(root, 'screens', 'checkout.pen'),
  pen({
    imports: { ui: '../library/ui.lib.pen', local: './local.lib.pen', json: '../library/ui.json' },
    children: [
      { id: 'cta', type: 'ref', ref: 'ui:button' },
      { id: 'tag', type: 'ref', ref: 'local:chip' },
      { id: 'raw', type: 'ref', ref: 'json:button' }
    ]
  })
)

/** Loads the document with `cwd` as the working directory. */
async function loadIn(cwd: string) {
  const previous = process.cwd()
  process.chdir(cwd)
  try {
    return await loadDocument(join(root, 'screens', 'checkout.pen'))
  } finally {
    process.chdir(previous)
  }
}

describe('loadDocument — .pen imports', () => {
  test('reads libraries in other folders of the working directory, and only .pen files', async () => {
    const graph = await loadIn(root)
    expect(graph.getNode('cta')?.componentId).toBe('ui:button')
    expect(graph.getNode('tag')?.componentId).toBe('local:chip')
    expect(graph.getNode('raw')?.type).toBe('FRAME')
    expect(graph.getNode('raw')?.componentId).toBeNull()
  })

  test('reads only libraries beside a document outside the working directory', async () => {
    const graph = await loadIn(join(root, 'screens'))
    expect(graph.getNode('tag')?.componentId).toBe('local:chip')
    expect(graph.getNode('cta')?.type).toBe('FRAME')
  })
})
