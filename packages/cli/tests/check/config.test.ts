import { describe, expect, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { defaultCheckConfig, readCheckConfig } from '#cli/check/config'

async function configFile(text: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'pairdraw-check-config-'))
  const path = join(dir, 'check.json')
  await writeFile(path, text)
  return path
}

describe('pairdraw check configuration', () => {
  test('no file means the defaults', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-check-none-'))
    expect(await readCheckConfig(join(dir, 'check.json'))).toEqual(defaultCheckConfig)
  })

  test('a partial file keeps the other defaults', async () => {
    const path = await configFile('{ "failOn": "warning", "responsive": { "widths": [390] } }')
    expect(await readCheckConfig(path)).toEqual({
      ...defaultCheckConfig,
      failOn: 'warning',
      responsive: { ...defaultCheckConfig.responsive, widths: [390] }
    })
  })

  test('an unknown key is refused, with the file named', async () => {
    const path = await configFile('{ "responsive": { "width": [390] } }')
    await expect(readCheckConfig(path)).rejects.toThrow(/responsive/)
  })

  test('a failOn outside the three levels is refused', async () => {
    const path = await configFile('{ "failOn": "sometimes" }')
    await expect(readCheckConfig(path)).rejects.toThrow(/failOn/)
  })

  test('broken JSON is refused, with the file named', async () => {
    const path = await configFile('{ "failOn": ')
    await expect(readCheckConfig(path)).rejects.toThrow(/Invalid JSON/)
  })

  test('widths outside the renderable range are refused', async () => {
    const path = await configFile('{ "responsive": { "widths": [0] } }')
    await expect(readCheckConfig(path)).rejects.toThrow(/widths/)
  })
})
