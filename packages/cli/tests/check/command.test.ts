import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CLI_ENTRY, FIXTURES } from '#cli-tests/helpers/paths'

setDefaultTimeout(120_000)

async function cli(cwd: string, args: string[]) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], {
    cwd,
    stdout: 'pipe',
    stderr: 'pipe'
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited
  ])
  return { stdout, stderr, exitCode }
}

describe('pairdraw check CLI', () => {
  test('no design files is a pass with an empty report', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-check-cli-empty-'))
    const { exitCode, stderr } = await cli(dir, ['check', '--out', 'report'])

    expect(exitCode).toBe(0)
    expect(stderr).toContain('Report written to report')
    const report = JSON.parse(await readFile(join(dir, 'report', 'report.json'), 'utf8'))
    expect(report.files).toEqual([])
    expect(report.exitCode).toBe(0)
  })

  test('token drift fails at the error level and --fail-on never passes it', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-check-cli-drift-'))
    await Bun.write(join(dir, 'globals.css'), ':root { --color-merk-blauw: #FF0000; }\n')
    await Bun.write(
      join(dir, 'check.json'),
      JSON.stringify({
        checks: { responsive: false, designMemory: false, tokens: true },
        tokens: { source: 'globals.css' }
      })
    )
    const document = join(FIXTURES, 'pen-variables.pen')

    const failed = await cli(dir, ['check', document, '--config', 'check.json', '--out', 'report'])
    expect(failed.exitCode).toBe(1)
    expect(failed.stdout).toContain('1 drifted tokens')

    const ignored = await cli(dir, [
      'check',
      document,
      '--config',
      'check.json',
      '--out',
      'report2',
      '--fail-on',
      'never'
    ])
    expect(ignored.exitCode).toBe(0)
    const json = await cli(dir, [
      'check',
      document,
      '--config',
      'check.json',
      '--out',
      'report3',
      '--json'
    ])
    expect(JSON.parse(json.stdout).totals.drift).toBe(1)
    // The report is machine output; the human lines stay on stderr.
    expect(json.stderr).toContain('Report written to report3')
    expect(json.stdout).not.toContain('Report written to')
  })

  test('a file that is not a design document exits 2 and says which file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-check-cli-bad-'))
    const { exitCode, stderr } = await cli(dir, ['check', 'notes.md'])

    expect(exitCode).toBe(2)
    expect(stderr).toContain('notes.md')
    expect(stderr).toContain('.fig')
  })

  test('an unknown --fail-on level exits 2', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-check-cli-level-'))
    const { exitCode, stderr } = await cli(dir, ['check', '--fail-on', 'sometimes'])

    expect(exitCode).toBe(2)
    expect(stderr).toContain('sometimes')
  })

  test('a broken config file exits 2 with its path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-check-cli-config-'))
    await Bun.write(join(dir, 'check.json'), '{ "responsive": { "width": [375] } }')
    const { exitCode, stderr } = await cli(dir, ['check', '--config', 'check.json'])

    expect(exitCode).toBe(2)
    expect(stderr).toContain('check.json')
  })

  test('several documents are checked in one run', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-check-cli-many-'))
    const { exitCode } = await cli(dir, [
      'check',
      join(FIXTURES, 'pencil_simple.pen'),
      join(FIXTURES, 'pen-variables.pen'),
      '--out',
      'report'
    ])

    expect(exitCode).toBe(0)
    const report = JSON.parse(await readFile(join(dir, 'report', 'report.json'), 'utf8'))
    expect(report.files.map((file: { path: string }) => file.path)).toEqual([
      join(FIXTURES, 'pencil_simple.pen'),
      join(FIXTURES, 'pen-variables.pen')
    ])
  })
})
