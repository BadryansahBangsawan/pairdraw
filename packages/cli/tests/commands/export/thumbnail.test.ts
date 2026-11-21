import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { copyFile, mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runCommand } from 'citty'

import { imageSize } from '@pairdraw/scene-graph/images'

import { CLI_ENTRY, FIXTURES } from '#cli-tests/helpers/paths'

import exportCommand from '#cli/commands/export'

setDefaultTimeout(60_000)

describe('export --thumbnail', () => {
  test('writes a page thumbnail that fits the given size', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-thumbnail-'))
    const file = join(dir, 'card.fig')
    await copyFile(join(FIXTURES, 'gold-preview.fig'), file)
    const output = join(dir, 'thumb.png')

    await runCommand(exportCommand, {
      rawArgs: [file, '-f', 'png', '-o', output, '--thumbnail', '--width', '200', '--height', '200']
    })

    const size = imageSize(await readFile(output))
    expect(size?.width).toBeLessThanOrEqual(200)
    expect(size?.height).toBeLessThanOrEqual(200)
  })

  test('refuses a node, which it would otherwise ignore', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-thumbnail-node-'))
    const file = join(dir, 'card.fig')
    await copyFile(join(FIXTURES, 'gold-preview.fig'), file)
    const output = join(dir, 'thumb.png')
    const proc = Bun.spawn(
      [process.execPath, CLI_ENTRY, 'export', file, '--thumbnail', '--node', '1:3466', '-o', output],
      { stdout: 'pipe', stderr: 'pipe' }
    )
    const stderr = await new Response(proc.stderr).text()
    expect(await proc.exited).toBe(1)
    expect(stderr).toContain('--thumbnail and --node cannot be used together.')
    expect(await Bun.file(output).exists()).toBe(false)
  })
})
