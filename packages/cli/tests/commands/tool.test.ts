import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { copyFile, mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CLI_ENTRY, FIXTURES } from '#cli-tests/helpers/paths'
import * as v from 'valibot'

import { imageSize } from '@pairdraw/scene-graph/images'

setDefaultTimeout(60_000)

const FIXTURE = join(FIXTURES, 'gold-preview.fig')

function parseJSON<T>(text: string, schema: v.GenericSchema<unknown, T>): T {
  return v.parse(v.pipe(v.string(), v.parseJson(), schema), text)
}

async function cli(args: string[], stdin?: string) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: stdin === undefined ? undefined : Buffer.from(stdin)
  })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited }
}

describe('tool CLI', () => {
  test('lists and describes tools with their effect and argument schema', async () => {
    const listed = await cli(['tool', 'list', '--json'])
    expect(listed.exitCode).toBe(0)
    const tools = parseJSON(
      listed.stdout,
      v.array(v.looseObject({ name: v.string(), effect: v.string() }))
    )
    expect(tools).toContainEqual(expect.objectContaining({ name: 'set_fill', effect: 'write' }))
    expect(tools).toContainEqual(expect.objectContaining({ name: 'list_pages', effect: 'read' }))

    const described = await cli(['tool', 'describe', 'create_page', '--json'])
    expect(described.exitCode).toBe(0)
    const info = parseJSON(
      described.stdout,
      v.looseObject({ schema: v.looseObject({ properties: v.record(v.string(), v.unknown()) }) })
    )
    expect(info.schema.properties).toHaveProperty('name')
  })

  test('calls a write tool headlessly and saves the result with --output', async () => {
    const outPath = join(await mkdtemp(join(tmpdir(), 'pairdraw-tool-')), 'out.fig')
    const created = await cli([
      'tool',
      'call',
      'create_page',
      FIXTURE,
      '--args',
      '{"name":"From CLI"}',
      '--output',
      outPath,
      '--json'
    ])
    expect(created.exitCode).toBe(0)
    expect(JSON.parse(created.stdout)).toMatchObject({ name: 'From CLI' })

    const pages = await cli(['tool', 'call', 'list_pages', outPath, '--json'])
    const result = parseJSON(
      pages.stdout,
      v.looseObject({ pages: v.array(v.looseObject({ name: v.string() })) })
    )
    expect(result.pages.map((page) => page.name)).toContain('From CLI')
  })

  test('rejects unknown tools and non-object arguments', async () => {
    const unknown = await cli(['tool', 'call', 'not_a_tool', FIXTURE])
    expect(unknown.exitCode).toBe(1)
    expect(unknown.stderr + unknown.stdout).toContain('Unknown tool "not_a_tool"')

    const appWrite = await cli(['tool', 'call', 'create_page', '--output', 'out.fig'])
    expect(appWrite.exitCode).toBe(1)
    expect(appWrite.stderr).toContain('--write and --output need a document file')

    const badArgs = await cli(['tool', 'call', 'list_pages', FIXTURE, '--args', '[1]'])
    expect(badArgs.exitCode).toBe(1)
    expect(badArgs.stderr + badArgs.stdout).toContain('Tool arguments must be a JSON object')
  })

  test('--preview-output writes a PNG of the current page after a change', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-tool-preview-'))
    const preview = join(dir, 'preview.png')
    const shape = '{"type":"RECTANGLE","x":0,"y":0,"width":120,"height":80}'
    const created = await cli([
      'tool',
      'call',
      'create_shape',
      FIXTURE,
      '--args',
      shape,
      '--preview-output',
      preview
    ])
    expect(created.exitCode).toBe(0)
    expect(created.stderr).toContain(`Preview: ${preview}`)
    expect(imageSize(new Uint8Array(await readFile(preview)))?.width).toBeGreaterThan(0)

    // A read leaves the document as it was, so it draws nothing.
    const unchanged = join(dir, 'unchanged.png')
    const read = await cli(['tool', 'call', 'list_pages', FIXTURE, '--preview-output', unchanged])
    expect(read.exitCode).toBe(0)
    expect(await Bun.file(unchanged).exists()).toBe(false)
  })
})

describe('tool arguments from stdin', () => {
  test('reads --args-file - from standard input', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-tool-stdin-'))
    const file = join(dir, 'card.fig')
    await copyFile(FIXTURE, file)

    const result = await cli(
      ['tool', 'call', 'create_shape', file, '--args-file', '-', '--json'],
      '{"type":"RECTANGLE","x":0,"y":0,"width":30,"height":30}'
    )

    expect(result.exitCode).toBe(0)
    const created = parseJSON(result.stdout, v.object({ type: v.literal('RECTANGLE') }))
    expect(created.type).toBe('RECTANGLE')
  })
})
