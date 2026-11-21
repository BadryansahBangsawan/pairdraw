import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stripVTControlCharacters } from 'node:util'

import { CLI_ENTRY, FIXTURES } from '#cli-tests/helpers/paths'

setDefaultTimeout(60_000)

async function cli(args: string[], env?: Record<string, string>) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: env ? { ...process.env, ...env } : undefined
  })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  // CI forces color; the contract is the text, so drop the terminal styling before matching.
  return {
    stdout: stripVTControlCharacters(stdout).trim(),
    stderr: stripVTControlCharacters(stderr).trim(),
    exitCode: await proc.exited
  }
}

const stackLine = /^\s+at /m

describe('a user error prints its message without a stack', () => {
  test('a missing document', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-error-output-'))
    const result = await cli(['info', join(dir, 'absent.fig')])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('ENOENT')
    expect(result.stderr).toContain('absent.fig')
    expect(result.stderr).not.toMatch(stackLine)
  })

  test('a value a command cannot honour', async () => {
    const file = join(FIXTURES, 'gold-preview.fig')
    const result = await cli(['export', file, '-f', 'png', '-s', '0', '-o', join(tmpdir(), 'unused.png')])
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('--scale must be between 0.01 and 16')
    expect(result.stderr).not.toMatch(stackLine)
  })

  test('PAIRDRAW_DEBUG keeps the stack for a crash', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-error-output-'))
    const result = await cli(['info', join(dir, 'absent.fig')], { PAIRDRAW_DEBUG: '1' })
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toMatch(stackLine)
  })

  test('pairdraw with no command shows the usage, as before', async () => {
    const result = await cli([])
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toContain('USAGE `pairdraw ')
    expect(result.stdout).toContain('COMMANDS')
    expect(result.stderr).toContain('No command specified.')
  })

  for (const group of ['libraries', 'diff', 'tool', 'analyze', 'agent']) {
    test(`pairdraw ${group} without its subcommand shows its usage`, async () => {
      const result = await cli([group])
      expect(result.exitCode).toBe(1)
      expect(result.stdout).toContain(`USAGE \`pairdraw ${group} `)
      expect(result.stderr).toContain('No command specified.')
    })
  }
})
