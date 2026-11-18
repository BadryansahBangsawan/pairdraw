import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import * as v from 'valibot'

import { exportFigFile } from '@pairdraw/core/io/formats/fig'
import { SceneGraph } from '@pairdraw/scene-graph'

import { CLI_ENTRY } from '#cli-tests/helpers/paths'

setDefaultTimeout(60_000)

const pageItemSchema = v.object({ id: v.string(), name: v.string(), nodes: v.number() })
const pagesSchema = v.array(pageItemSchema)
const fontsSchema = v.object({ faces: v.array(v.object({ family: v.string() })) })

async function cli(args: string[]) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited }
}

/** A .fig with two pages of ten layers each, written so the reader loads pages lazily. */
async function twoPageFile(): Promise<string> {
  const graph = new SceneGraph()
  const first = graph.getPages()[0]
  const second = graph.addPage('Page 2')
  for (const page of [first, second]) {
    for (let index = 0; index < 10; index += 1) {
      graph.createNode('RECTANGLE', page.id, { x: index * 20, y: 0, width: 10, height: 10 })
    }
  }
  const exported = await exportFigFile(graph)
  const dir = await mkdtemp(join(tmpdir(), 'pairdraw-pages-'))
  const file = join(dir, 'two-pages.fig')
  await writeFile(file, new Uint8Array(exported.buffer))
  return file
}

describe('pairdraw pages', () => {
  test('counts the layers of every page, not only the pages already read', async () => {
    const file = await twoPageFile()
    const result = await cli(['pages', file, '--json'])
    expect(result.exitCode).toBe(0)
    const pages = v.parse(v.pipe(v.string(), v.parseJson(), pagesSchema), result.stdout)
    expect(pages.map((page) => [page.name, page.nodes])).toEqual([
      ['Page 1', 10],
      ['Page 2', 10]
    ])
  })
})

/** A .fig whose second page alone holds text in a family no other page uses. */
async function secondPageFont(): Promise<string> {
  const graph = new SceneGraph()
  const second = graph.addPage('Page 2')
  graph.createNode('TEXT', second.id, {
    text: 'Fonts live on page two',
    fontFamily: 'Lazily Loaded Face',
    fontSize: 14,
    width: 200,
    height: 20
  })
  const exported = await exportFigFile(graph)
  const dir = await mkdtemp(join(tmpdir(), 'pairdraw-fonts-'))
  const file = join(dir, 'second-page-font.fig')
  await writeFile(file, new Uint8Array(exported.buffer))
  return file
}

describe('pairdraw fonts', () => {
  test('reports the fonts of pages it has not read yet', async () => {
    const file = await secondPageFont()
    const result = await cli(['fonts', file, '--json'])
    expect(result.exitCode).toBe(0)
    const status = v.parse(v.pipe(v.string(), v.parseJson(), fontsSchema), result.stdout)
    expect(status.faces.map((face) => face.family)).toContain('Lazily Loaded Face')
  })
})
