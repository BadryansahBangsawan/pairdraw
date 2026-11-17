import { describe, expect, test } from 'bun:test'
import { chmod, mkdtemp, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { writeInsideRoot } from '#mcp/tool/output'

describe('MCP file output', () => {
  test('replaces a file inside the root instead of writing into it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pairdraw-mcp-atomic-'))
    const path = join(root, 'design.pen')
    await writeFile(path, 'ORIGINAL')
    await chmod(path, 0o640)
    const before = await stat(path)

    const written = await writeInsideRoot('design.pen', root, 'NEXT')

    const after = await stat(path)
    expect(written.written).toBe(path)
    expect(written.byteLength).toBe(4)
    expect(after.ino).not.toBe(before.ino)
    expect(after.mode & 0o777).toBe(0o640)
    expect(await readFile(path, 'utf8')).toBe('NEXT')
    expect((await readdir(root)).filter((name) => name.includes('.tmp'))).toEqual([])
  })
})
