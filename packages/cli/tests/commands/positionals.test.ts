import { describe, expect, setDefaultTimeout, test } from 'bun:test'

import { CLI_ENTRY, FIXTURES } from '#cli-tests/helpers/paths'

import { join } from 'node:path'

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

describe('extra positionals', () => {
  test('refuses an argument no option claims', async () => {
    const result = await cli(['tree', FIXTURE, 'second.fig'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Unexpected argument: second.fig')
  })

  test('refuses a second file where the command takes one', async () => {
    const result = await cli(['convert', FIXTURE, 'out.pen'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Unexpected argument: out.pen')
  })
})
