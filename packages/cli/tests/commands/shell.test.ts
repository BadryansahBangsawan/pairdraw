import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CLI_ENTRY, FIXTURES } from '#cli-tests/helpers/paths'
import * as v from 'valibot'

import { imageSize } from '@open-pencil/scene-graph/images'

setDefaultTimeout(120_000)

const FIXTURE = join(FIXTURES, 'gold-preview.fig')

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

const pagesSchema = v.looseObject({ pages: v.array(v.looseObject({ name: v.string() })) })

async function pageNames(file: string): Promise<string[]> {
  const listed = await cli(['tool', 'call', 'list_pages', file, '--json'])
  const result = v.parse(v.pipe(v.string(), v.parseJson(), pagesSchema), listed.stdout)
  return result.pages.map((page) => page.name)
}

describe('shell CLI', () => {
  test('keeps one document loaded across piped lines and saves it with save()', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'open-pencil-shell-'))
    const output = join(dir, 'out.fig')
    const script = [
      'create_page {"name": "First"}',
      '# the second call sees the first one',
      'create_page({"name": "Second"})',
      'list_pages',
      'save()',
      'exit()'
    ].join('\n')

    const run = await cli(['shell', FIXTURE, '--output', output], script)
    expect(run.exitCode).toBe(0)
    expect(run.stderr).toContain(`Saved ${output}`)
    expect(run.stdout).toContain('"Second"')
    expect(await pageNames(output)).toEqual(expect.arrayContaining(['First', 'Second']))
  })

  test('writes a preview PNG of the current page after each change', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'open-pencil-shell-preview-'))
    const preview = join(dir, 'preview.png')
    const script = [
      'create_shape {"type": "RECTANGLE", "x": 0, "y": 0, "width": 120, "height": 80}',
      'exit()'
    ].join('\n')

    const run = await cli(['shell', FIXTURE, '--preview-output', preview], script)
    expect(run.exitCode).toBe(0)
    expect(run.stderr).toContain(`Preview: ${preview}`)
    expect(run.stderr).toContain('Changes were not saved')
    const size = imageSize(new Uint8Array(await readFile(preview)))
    expect(size?.width).toBeGreaterThan(0)
  })

  test('fails a piped script whose line failed, after running the rest', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'open-pencil-shell-fail-'))
    const output = join(dir, 'out.fig')
    const script = ['not_a_tool', 'create_page {"name": "After"}', 'save()'].join('\n')

    const run = await cli(['shell', FIXTURE, '-o', output], script)
    expect(run.exitCode).toBe(1)
    expect(run.stderr).toContain('Unknown tool "not_a_tool"')
    expect(await pageNames(output)).toContain('After')
  })

  test('refuses a preview scale the renderer would not draw', async () => {
    const run = await cli(['shell', FIXTURE, '--preview-scale', '9'], 'exit()')
    expect(run.exitCode).toBe(1)
    expect(run.stderr).toContain('--preview-scale must be a number from 0.1 to 4')
  })
})
