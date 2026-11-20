import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CLI_ENTRY } from '#cli-tests/helpers/paths'

import { createEditor } from '@pairdraw/core'
import { exportFigFile } from '@pairdraw/core/io/formats/fig'
import { FigmaAPI } from '@pairdraw/core/figma-api'
import { initCodec } from '@pairdraw/kiwi/fig/codec'
import {
  addDesignDecision,
  allowDesignValue,
  createDesignMemory,
  writeDesignMemory
} from '@pairdraw/scene-graph/design-memory'

setDefaultTimeout(60_000)

async function cli(args: string[]) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited }
}

/** A `.fig` file whose memory allows one brand color, with a rectangle to paint. */
async function documentFile(): Promise<{ file: string; cardId: string }> {
  await initCodec()
  const editor = createEditor()
  const card = new FigmaAPI(editor.graph).createRectangle()
  let memory = allowDesignValue(createDesignMemory(), 'colors', '#1A73E8')
  memory = addDesignDecision(memory, 'Cards use the brand color.', 'person')
  writeDesignMemory(editor.graph, memory)
  const file = join(await mkdtemp(join(tmpdir(), 'pairdraw-design-memory-')), 'doc.fig')
  await writeFile(file, await exportFigFile(editor.graph))
  editor.dispose()
  return { file, cardId: card.id }
}

describe('the design memory from the CLI', () => {
  test('prints the memory', async () => {
    const { file } = await documentFile()
    const result = await cli(['design-memory', file, '--json'])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('#1A73E8')
    expect(result.stdout).toContain('Cards use the brand color.')
  })

  test("a person's tool call with an off-system color goes through with a warning", async () => {
    const { file, cardId } = await documentFile()
    const before = await readFile(file)
    const result = await cli([
      'tool',
      'call',
      'set_fill',
      file,
      '--args',
      JSON.stringify({ id: cardId, color: '#FF00AA' }),
      '--write',
      '--json'
    ])
    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain('design_memory')
    expect(await readFile(file)).not.toEqual(before)
  })

  test('with --enforce-design-memory the call fails and writes nothing', async () => {
    const { file, cardId } = await documentFile()
    const before = await readFile(file)
    const result = await cli([
      'tool',
      'call',
      'set_fill',
      file,
      '--args',
      JSON.stringify({ id: cardId, color: '#FF00AA' }),
      '--enforce-design-memory',
      '--write'
    ])
    expect(result.exitCode).toBe(1)
    expect(`${result.stdout}\n${result.stderr}`).toContain('nearest allowed: #1A73E8')
    expect(await readFile(file)).toEqual(before)
  })

  test('eval keeps what breaks the memory, warns about it, and exits 0', async () => {
    const { file, cardId } = await documentFile()
    const result = await cli([
      'eval',
      file,
      '-w',
      '-c',
      `figma.getNodeById('${cardId}').fills = [{ type: 'SOLID', color: { r: 0, g: 1, b: 0.5 } }]`
    ])
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toContain('#00FF80')
  })
})
