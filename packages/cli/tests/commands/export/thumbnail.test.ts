import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { copyFile, mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runCommand } from 'citty'

import { imageSize } from '@pairdraw/scene-graph/images'

import { FIXTURES } from '#cli-tests/helpers/paths'

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
})
