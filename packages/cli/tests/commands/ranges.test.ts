import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CLI_ENTRY, FIXTURES } from '#cli-tests/helpers/paths'

setDefaultTimeout(60_000)

async function cli(args: string[]) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited }
}

const FIXTURE = join(FIXTURES, 'gold-preview.fig')

describe('numeric options', () => {
  test('refuses a raster quality above 100', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-ranges-'))
    const result = await cli(['export', FIXTURE, '-f', 'jpg', '-q', '500', '-o', join(dir, 'a.jpg')])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('--quality must be between 0 and 100')
  })

  test('refuses a colour threshold below zero', async () => {
    const result = await cli(['analyze', 'colors', FIXTURE, '--threshold', '-5'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('--threshold must be between 0 and 50')
  })

  test('accepts the values at the edges of the ranges', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-ranges-ok-'))
    expect((await cli(['export', FIXTURE, '-f', 'jpg', '-q', '100', '-o', join(dir, 'a.jpg')])).exitCode).toBe(0)
    expect((await cli(['analyze', 'colors', FIXTURE, '--threshold', '50'])).exitCode).toBe(0)
  })
})
