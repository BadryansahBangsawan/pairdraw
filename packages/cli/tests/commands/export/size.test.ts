import { describe, expect, setDefaultTimeout, spyOn, test } from 'bun:test'
import { mkdtemp, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runCommand } from 'citty'

import exportCommand from '#cli/commands/export'

setDefaultTimeout(60_000)

describe('export CLI', () => {
  test('reports the size of a text export in bytes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-export-size-'))
    const source = join(dir, 'note.pen')
    const output = join(dir, 'note.jsx')
    // Two UTF-8 bytes per character, so a count of characters reads about half the size.
    const content = 'é'.repeat(4096)
    await Bun.write(
      source,
      JSON.stringify({ version: '2.21', children: [{ id: 'note', type: 'text', content }] })
    )
    const log = spyOn(console, 'log').mockImplementation(() => undefined)
    try {
      await runCommand(exportCommand, { rawArgs: [source, '-f', 'tailwind-jsx', '-o', output] })
      const printed = log.mock.calls.map((call) => String(call[0])).join('\n')
      const reported = /\(([\d.]+) KB\)/.exec(printed)?.[1]
      expect(reported).toBe(((await stat(output)).size / 1024).toFixed(1))
    } finally {
      log.mockRestore()
    }
  })
})
