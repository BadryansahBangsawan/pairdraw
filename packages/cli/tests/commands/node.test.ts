import { beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CLI_ENTRY } from '#cli-tests/helpers/paths'
import * as v from 'valibot'

import { exportFigFile } from '@pairdraw/core/io/formats/fig'
import { SceneGraph } from '@pairdraw/scene-graph'

setDefaultTimeout(60_000)

async function cli(args: string[]) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited }
}

const nodeSchema = v.looseObject({
  topLeftRadius: v.optional(v.number()),
  topRightRadius: v.optional(v.number()),
  bottomRightRadius: v.optional(v.number()),
  bottomLeftRadius: v.optional(v.number()),
  isMask: v.optional(v.boolean()),
  maskType: v.optional(v.string()),
  booleanOperation: v.optional(v.string())
})

const parseNode = (text: string) => v.parse(v.pipe(v.string(), v.parseJson(), nodeSchema), text)

describe('node --json', () => {
  let file: string
  let detailed: string
  let plain: string

  beforeAll(async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    detailed = graph.createNode('BOOLEAN_OPERATION', page.id, {
      name: 'Cut',
      width: 40,
      height: 40,
      booleanOperation: 'SUBTRACT',
      isMask: true,
      maskType: 'VECTOR',
      cornerRadius: 4,
      independentCorners: true,
      topLeftRadius: 4,
      topRightRadius: 8,
      bottomRightRadius: 12,
      bottomLeftRadius: 16
    }).id
    plain = graph.createNode('RECTANGLE', page.id, { name: 'Box', width: 40, height: 40 }).id
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-node-json-'))
    file = join(dir, 'node.fig')
    await writeFile(file, await exportFigFile(graph))
  })

  test('reports differing corners, a mask, and a boolean operation', async () => {
    const result = await cli(['node', file, '--id', detailed, '--json'])
    expect(result.exitCode).toBe(0)
    const json = parseNode(result.stdout)
    expect(json).toMatchObject({
      topLeftRadius: 4,
      topRightRadius: 8,
      bottomRightRadius: 12,
      bottomLeftRadius: 16,
      isMask: true,
      maskType: 'VECTOR',
      booleanOperation: 'SUBTRACT'
    })
  })

  test('leaves those fields out for a plain rectangle', async () => {
    const result = await cli(['node', file, '--id', plain, '--json'])
    expect(result.exitCode).toBe(0)
    const json = parseNode(result.stdout)
    for (const field of [
      'topLeftRadius',
      'topRightRadius',
      'bottomRightRadius',
      'bottomLeftRadius',
      'isMask',
      'maskType',
      'booleanOperation'
    ])
      expect(field in json).toBe(false)
  })
})
