import { beforeAll, describe, expect, setDefaultTimeout, test } from 'bun:test'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { workspaceRoot } from '#cli-tests/helpers/paths'
import * as v from 'valibot'

setDefaultTimeout(180_000)

/**
 * A one-rectangle document with one color variable. Small enough that each
 * Node process only pays for CanvasKit startup, and rich enough that
 * `variables` and `tokens` have something to print.
 */
const FIXTURE = JSON.stringify({
  version: '2.21',
  variables: {
    accent: { type: 'color', value: '#3366CC' }
  },
  children: [
    {
      id: 'card',
      type: 'rectangle',
      name: 'Card',
      x: 0,
      y: 0,
      width: 120,
      height: 80,
      fill: '#3366CC'
    }
  ]
})

interface CommandResult {
  stdout: string
  stderr: string
  exitCode: number
}

const infoSchema = v.object({ pages: v.number(), totalNodes: v.number() })
const querySchema = v.array(v.object({ name: v.string() }))
const lintSchema = v.object({ messages: v.array(v.unknown()) })

function parseOutput<TSchema extends v.GenericSchema>(
  text: string,
  schema: TSchema
): v.InferOutput<TSchema> {
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), schema), text)
  if (!parsed.success) throw new Error(v.summarize(parsed.issues))
  return parsed.output
}

/** The first `node` on PATH that is Node, not a Bun shim. */
function nodeBinary(): string | null {
  for (const dir of (process.env.PATH ?? '').split(':')) {
    if (!dir) continue
    const candidate = join(dir, 'node')
    if (!existsSync(candidate)) continue
    const probed = Bun.spawnSync([candidate, '-p', 'process.versions.bun ? "bun" : "node"'], {
      stdout: 'pipe',
      stderr: 'pipe'
    })
    if (probed.exitCode !== 0) continue
    if (probed.stdout.toString().trim() === 'node') return candidate
  }
  return null
}

function hasPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((byte, index) => bytes[index] === byte)
}

const node = nodeBinary()
const root = workspaceRoot()
const cli = join(root, 'packages/cli/bin/pairdraw.js')

function run(args: string[]): Promise<CommandResult> {
  if (!node) return Promise.reject(new Error('node is not installed'))
  const proc = Bun.spawn([node, cli, ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    cwd: root
  })
  return Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited
  ]).then(([stdout, stderr, exitCode]) => ({
    stdout: stdout.trim(),
    stderr: stderr.trim(),
    exitCode
  }))
}

if (!node) {
  test.skip('built CLI under Node (node is not installed)', () => {
    // Re-run after installing Node. Bun-only checkouts skip this suite.
  })
} else {
  describe('built CLI under Node', () => {
    let dir = ''
    let pen = ''
    let fig = ''

    beforeAll(async () => {
      if (!existsSync(join(root, 'packages/cli/dist/index.mjs'))) {
        throw new Error(
          'Built CLI is missing at packages/cli/dist/index.mjs. Run bun run build:packages before this smoke test.'
        )
      }
      dir = await mkdtemp(join(tmpdir(), 'pairdraw-node-cli-'))
      pen = join(dir, 'card.pen')
      fig = join(dir, 'card.fig')
      await writeFile(pen, FIXTURE)
      const converted = await run(['convert', pen, '-f', 'fig', '-o', fig])
      if (converted.exitCode !== 0) {
        throw new Error(
          `Could not prepare the .fig fixture:\n${converted.stderr}\n${converted.stdout}`
        )
      }
    })

    test('info prints the document summary', async () => {
      const result = await run(['info', fig, '--json'])
      expect(result.exitCode).toBe(0)
      const summary = parseOutput(result.stdout, infoSchema)
      expect(summary.pages).toBeGreaterThan(0)
      expect(summary.totalNodes).toBeGreaterThan(0)
    })

    test('tree prints the rectangle', async () => {
      const result = await run(['tree', fig, '--json'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Card')
    })

    test('query finds the rectangle', async () => {
      const result = await run(['query', fig, '//RECTANGLE', '--json'])
      expect(result.exitCode).toBe(0)
      const nodes = parseOutput(result.stdout, querySchema)
      expect(nodes.some((node) => node.name === 'Card')).toBe(true)
    })

    test('eval reads the document without writing it', async () => {
      const before = await readFile(pen)
      const result = await run([
        'eval',
        pen,
        '-c',
        'console.log(figma.currentPage.children.length)'
      ])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('1')
      expect(result.stderr).not.toContain('Written to')
      const after = await readFile(pen)
      expect(Array.from(after)).toEqual(Array.from(before))
    })

    test('lint exits cleanly', async () => {
      const result = await run(['lint', fig, '--json'])
      expect(result.exitCode).toBe(0)
      const report = parseOutput(result.stdout, lintSchema)
      expect(Array.isArray(report.messages)).toBe(true)
    })

    test('variables lists the color variable', async () => {
      const result = await run(['variables', pen, '--json'])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('accent')
    })

    test('tokens prints the variables as JSON', async () => {
      const result = await run(['tokens', pen, '--json'])
      expect(result.exitCode).toBe(0)
      parseOutput(result.stdout, v.unknown())
      expect(result.stdout).toContain('accent')
    })

    test.each([
      ['png', [0x89, 0x50, 0x4e, 0x47]],
      ['jpg', [0xff, 0xd8, 0xff]],
      ['webp', [0x52, 0x49, 0x46, 0x46]]
    ] as const)('export -f %s writes that image', async (format, prefix) => {
      const output = join(dir, `card.${format}`)
      const result = await run(['export', fig, '-f', format, '-o', output])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Exported')
      expect(hasPrefix(await readFile(output), prefix)).toBe(true)
    })

    test('export -f svg writes an svg document', async () => {
      const output = join(dir, 'card.svg')
      const result = await run(['export', fig, '-f', 'svg', '-o', output])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Exported')
      expect(await readFile(output, 'utf8')).toContain('<svg')
    })

    test('export -f pdf writes a pdf', async () => {
      const output = join(dir, 'card.pdf')
      const result = await run(['export', fig, '-f', 'pdf', '-o', output])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Exported')
      expect(hasPrefix(await readFile(output), [0x25, 0x50, 0x44, 0x46])).toBe(true)
    })

    test('convert writes .fig to .pen and back', async () => {
      const penOut = join(dir, 'round.pen')
      const figOut = join(dir, 'round.fig')
      const toPen = await run(['convert', fig, '-f', 'pen', '-o', penOut])
      expect(toPen.exitCode).toBe(0)
      expect(toPen.stdout).toContain('Converted')
      expect(await readFile(penOut, 'utf8')).toContain('"version"')
      const toFig = await run(['convert', penOut, '-f', 'fig', '-o', figOut])
      expect(toFig.exitCode).toBe(0)
      expect(toFig.stdout).toContain('Converted')
      expect(hasPrefix(await readFile(figOut), [0x50, 0x4b, 0x03, 0x04])).toBe(true)
    })
  })
}
