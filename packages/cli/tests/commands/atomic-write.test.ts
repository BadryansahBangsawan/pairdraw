import { describe, expect, setDefaultTimeout, spyOn, test } from 'bun:test'
import { chmod, lstat, mkdtemp, readdir, readFile, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { runCommand } from 'citty'

import convert from '#cli/commands/convert'
import exportCommand from '#cli/commands/export'

setDefaultTimeout(60_000)

const pen = JSON.stringify({
  version: '2.21',
  children: [{ id: 'card', type: 'rectangle', width: 10, height: 10, fill: '#111111' }]
})

async function quietly(run: () => Promise<unknown>) {
  const log = spyOn(console, 'log').mockImplementation(() => undefined)
  try {
    await run()
  } finally {
    log.mockRestore()
  }
}

describe('convert and export replace the output file', () => {
  test('convert writes a new .pen file over the previous one', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-convert-atomic-'))
    const source = join(dir, 'card.pen')
    const output = join(dir, 'out.pen')
    await writeFile(source, pen)
    await writeFile(output, 'ORIGINAL')
    await chmod(output, 0o640)
    const before = await stat(output)

    await quietly(() => runCommand(convert, { rawArgs: [source, '-f', 'pen', '-o', output] }))

    const after = await stat(output)
    expect(after.ino).not.toBe(before.ino)
    expect(after.mode & 0o777).toBe(0o640)
    expect(await readFile(output, 'utf8')).not.toBe('ORIGINAL')
    expect((await readdir(dir)).filter((name) => name.includes('.tmp'))).toEqual([])
  })

  test('convert keeps a symlink and replaces the file it points at', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-convert-link-'))
    const source = join(dir, 'card.pen')
    const target = join(dir, 'real.pen')
    const link = join(dir, 'link.pen')
    await writeFile(source, pen)
    await writeFile(target, 'ORIGINAL')
    await symlink(target, link)
    const before = await stat(target)

    await quietly(() => runCommand(convert, { rawArgs: [source, '-f', 'pen', '-o', link] }))

    expect((await lstat(link)).isSymbolicLink()).toBe(true)
    expect(await readFile(target, 'utf8')).not.toBe('ORIGINAL')
    expect((await stat(target)).ino).not.toBe(before.ino)
  })

  test('export writes a new file over the previous one', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-export-atomic-'))
    const source = join(dir, 'note.pen')
    const output = join(dir, 'note.jsx')
    await writeFile(
      source,
      JSON.stringify({
        version: '2.21',
        children: [{ id: 'note', type: 'text', content: 'Hello' }]
      })
    )
    await writeFile(output, 'ORIGINAL')
    await chmod(output, 0o640)
    const before = await stat(output)

    await quietly(() =>
      runCommand(exportCommand, { rawArgs: [source, '-f', 'tailwind-jsx', '-o', output] })
    )

    const after = await stat(output)
    expect(after.ino).not.toBe(before.ino)
    expect(after.mode & 0o777).toBe(0o640)
    expect(await readFile(output, 'utf8')).not.toBe('ORIGINAL')
    expect((await readdir(dir)).filter((name) => name.includes('.tmp'))).toEqual([])
  })
})
