import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CLI_ENTRY } from '#cli-tests/helpers/paths'

setDefaultTimeout(60_000)

async function cli(args: string[]) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], {
    stdout: 'pipe',
    stderr: 'pipe'
  })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited }
}

async function penDocument(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'pairdraw-options-'))
  const source = join(dir, 'note.pen')
  await writeFile(
    source,
    JSON.stringify({
      version: '2.21',
      children: [{ id: 'note', type: 'rectangle', width: 10, height: 10, fill: '#111111' }]
    })
  )
  return source
}

describe('CLI options', () => {
  test('refuses an option the command does not declare', async () => {
    const source = await penDocument()
    const result = await cli(['info', source, '--nope'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Unknown option: --nope')
    expect(result.stdout).not.toContain('pages')
  })

  test('refuses a short option the command does not declare', async () => {
    const source = await penDocument()
    const result = await cli(['tree', source, '-q'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Unknown option: -q')
  })

  test('accepts the --no- form of a boolean option', async () => {
    const source = await penDocument()
    const output = join(await mkdtemp(join(tmpdir(), 'pairdraw-options-out-')), 'page.html')
    const result = await cli(['export', source, '-f', 'html', '--no-layer-names', '-o', output])

    expect(result.stderr).not.toContain('Unknown option')
    expect(result.exitCode).toBe(0)
  })

  test('reads an option value that starts with a dash', async () => {
    const source = await penDocument()
    const result = await cli(['eval', source, '-c', 'return "--not-a-flag"'])

    expect(result.stderr).not.toContain('Unknown option')
    expect(result.stdout).toContain('--not-a-flag')
  })

  test('refuses an unknown flag after a boolean option', async () => {
    const source = await penDocument()
    const result = await cli(['lint', source, '--fix', '--bad'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Unknown option: --bad')
  })

  test('refuses the --no- form of an option the command does not declare', async () => {
    const source = await penDocument()
    const result = await cli(['info', source, '--no-color'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Unknown option: --no-color')
  })

  test('accepts a cluster of declared short options', async () => {
    const source = await penDocument()
    const result = await cli(['eval', source, '-qc', 'return 1 + 1'])

    expect(result.exitCode).toBe(0)
    expect(result.stderr).not.toContain('Unknown option')
  })

  test('refuses an unknown letter inside a short option cluster', async () => {
    const source = await penDocument()
    const result = await cli(['eval', source, '-cx', 'return 1'])

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Unknown option: -x')
  })
})
