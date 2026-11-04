import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { CLI_ENTRY } from '#cli-tests/helpers/paths'

setDefaultTimeout(60_000)

async function cli(args: string[]) {
  const proc = Bun.spawn([process.execPath, CLI_ENTRY, ...args], { stdout: 'pipe', stderr: 'pipe' })
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode: await proc.exited }
}

describe('tokens CLI', () => {
  test('imports a local stylesheet as variables', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'open-pencil-tokens-import-'))
    const authored = join(dir, 'tokens.pen')
    const source = join(dir, 'tokens.fig')
    const css = join(dir, 'theme.css')
    await writeFile(
      authored,
      JSON.stringify({
        version: '2.21',
        children: [{ id: 'frame', type: 'frame', name: 'Page' }]
      })
    )
    await writeFile(css, ':root {\n  --brand: #2947ff;\n  --space: 8px;\n}\n')
    const created = await cli(['convert', authored, '-o', source])
    expect(created.exitCode).toBe(0)

    const imported = await cli(['tokens', '--import', css, source, '--write'])
    expect(imported.exitCode).toBe(0)
    expect(imported.stdout).toContain('Imported 2 variables')

    const listed = await cli(['tokens', '--format', 'css', source])
    expect(listed.exitCode).toBe(0)
    expect(listed.stdout).toContain('--brand')
    expect(listed.stdout).toContain('--space')
  })
})

describe('tokens --project', () => {
  test('imports a project folder and reports JavaScript config', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'open-pencil-tokens-project-'))
    const project = join(dir, 'app')
    const authored = join(dir, 'tokens.pen')
    const source = join(dir, 'tokens.fig')
    await mkdir(join(project, 'src'), { recursive: true })
    await writeFile(
      join(project, 'src', 'theme.css'),
      '@theme {\n  --color-brand: #2947ff;\n  --spacing-md: 1rem;\n}\n'
    )
    await writeFile(join(project, 'tailwind.config.js'), 'module.exports = { theme: {} }\n')
    await writeFile(
      authored,
      JSON.stringify({
        version: '2.21',
        children: [{ id: 'frame', type: 'frame', name: 'Page' }]
      })
    )
    const created = await cli(['convert', authored, '-o', source])
    expect(created.exitCode).toBe(0)

    const imported = await cli(['tokens', '--project', project, source, '--write'])
    expect(imported.exitCode).toBe(0)
    expect(imported.stdout).toContain('Imported 2 variables')
    expect(imported.stderr).toContain('tailwind.config.js')
    expect(imported.stderr).toContain('not executed')

    const listed = await cli(['tokens', '--format', 'css', source])
    expect(listed.exitCode).toBe(0)
    expect(listed.stdout).toContain('--color-brand')
    expect(listed.stdout).toContain('--spacing-md')

    const both = await cli([
      'tokens',
      '--import',
      join(project, 'src', 'theme.css'),
      '--project',
      project,
      source
    ])
    expect(both.exitCode).not.toBe(0)
    expect(`${both.stdout}\n${both.stderr}`).toContain('not both')
  })
})
