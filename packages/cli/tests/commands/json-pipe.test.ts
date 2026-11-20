import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { join } from 'node:path'

import { CLI_ENTRY, FIXTURES } from '#cli-tests/helpers/paths'

setDefaultTimeout(60_000)

const FIXTURE = join(FIXTURES, 'gold-preview.fig')

/**
 * Bun's console.log drops what a pipe does not take at once (64 KB) after anything touches
 * process.stdout, so a large --json output piped into jq arrived truncated. The documented
 * `pairdraw tree design.fig --json | jq '.[] | .name'` must carry the whole document.
 */
async function piped(args: string[]): Promise<{ text: string; exitCode: number }> {
  // A real OS pipe, as `| jq` gives: Bun.spawn's own pipe drains fast enough to hide the drop.
  // The CLI's arguments arrive as positional parameters, so a path with a quote in it needs no
  // quoting for the shell and cannot break the command.
  const proc = Bun.spawn(['sh', '-c', '"$0" "$@" | cat', process.execPath, CLI_ENTRY, ...args], {
    stdout: 'pipe',
    stderr: 'pipe'
  })
  const text = await new Response(proc.stdout).text()
  return { text, exitCode: await proc.exited }
}

describe('large JSON output through a pipe', () => {
  test('tree --json carries the whole tree, not the first 64 KB', async () => {
    const { text, exitCode } = await piped(['tree', FIXTURE, '--json'])

    expect(exitCode).toBe(0)
    expect(text.length).toBeGreaterThan(65_536)
    const pages: unknown = JSON.parse(text)
    expect(Array.isArray(pages)).toBe(true)
  })

  test('query --json carries every match through a pipe', async () => {
    const { text, exitCode } = await piped(['query', FIXTURE, '//TEXT', '--json'])

    expect(exitCode).toBe(0)
    const rows: unknown = JSON.parse(text)
    expect(Array.isArray(rows)).toBe(true)
  })
})