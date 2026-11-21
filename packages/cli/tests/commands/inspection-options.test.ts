import { beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { exportFigFile } from '@pairdraw/core/io/formats/fig'
import { SceneGraph } from '@pairdraw/scene-graph'

import { CLI_ENTRY } from '#cli-tests/helpers/paths'

setDefaultTimeout(60_000)

async function cli(args: string[]) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited }
}

/** A .fig with one page, one frame and one rectangle inside it. */
async function smallFile(): Promise<string> {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  const frame = graph.createNode('FRAME', page.id, { name: 'Card', width: 200, height: 100 })
  graph.createNode('RECTANGLE', frame.id, { name: 'Box', width: 40, height: 40 })
  const dir = await mkdtemp(join(tmpdir(), 'pairdraw-inspection-options-'))
  const file = join(dir, 'small.fig')
  await writeFile(file, await exportFigFile(graph))
  return file
}

describe('inspection commands refuse an option they cannot honour', () => {
  let file: string
  beforeAll(async () => {
    file = await smallFile()
  })

  async function expectRefused(args: string[], message: string) {
    const result = await cli(args)
    expect(result.exitCode).not.toBe(0)
    expect(result.stderr).toContain(message)
    expect(result.stdout).toBe('')
  }

  test('tree refuses a negative depth', async () => {
    await expectRefused(['tree', file, '--depth', '-1'], '--depth must be a non-negative integer, got "-1"')
  })

  test('tree refuses a depth that is not a number', async () => {
    await expectRefused(['tree', file, '--depth', 'abc'], '--depth must be a non-negative integer, got "abc"')
  })

  test('tree refuses a fractional depth', async () => {
    await expectRefused(['tree', file, '--depth', '1.5'], '--depth must be a non-negative integer, got "1.5"')
  })

  test('find refuses a limit that is not a number', async () => {
    await expectRefused(['find', file, '--limit', 'abc'], '--limit must be a positive integer, got "abc"')
  })

  test('find refuses a zero limit', async () => {
    await expectRefused(['find', file, '--limit', '0'], '--limit must be a positive integer, got "0"')
  })

  test('find refuses a negative limit', async () => {
    await expectRefused(['find', file, '--limit', '-2'], '--limit must be a positive integer, got "-2"')
  })

  test('query refuses a limit it cannot honour', async () => {
    await expectRefused(['query', file, '//FRAME', '--limit', '-2'], '--limit must be a positive integer, got "-2"')
  })

  test('the documented values still run', async () => {
    expect((await cli(['tree', file, '--depth', '0'])).exitCode).toBe(0)
    const found = await cli(['find', file, '--limit', '1'])
    expect(found.exitCode).toBe(0)
    expect(found.stdout).toContain('Found 1 node')
    const queried = await cli(['query', file, '//FRAME', '--limit', '1'])
    expect(queried.exitCode).toBe(0)
    expect(queried.stdout).toContain('Found 1 node')
  })
})
