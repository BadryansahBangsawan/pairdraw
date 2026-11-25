import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, readdir, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { FIXTURES, workspaceRoot } from '#cli-tests/helpers/paths'

import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'
import {
  createDesignMemory,
  writeDesignMemory,
  type DesignMemory
} from '@pairdraw/scene-graph/design-memory'

import { defaultCheckConfig, type CheckConfig } from '#cli/check/config'
import { reportJSON, reportMarkdown, writeReport } from '#cli/check/report'
import { readResponsiveResult, runCheck } from '#cli/check/run'
import { writeDocumentFile } from '#cli/headless'

setDefaultTimeout(120_000)

const WORKSPACE = workspaceRoot()

const RED = { r: 1, g: 0, b: 85 / 255, a: 1 }
const BLUE = { r: 26 / 255, g: 115 / 255, b: 232 / 255, a: 1 }

const allowOnlyBlue: DesignMemory = {
  ...createDesignMemory(),
  colors: { fromSystem: false, values: ['#1A73E8'], enforce: 'refuse' },
  fonts: { ...createDesignMemory().fonts, enforce: 'off' },
  fontSizes: { ...createDesignMemory().fontSizes, enforce: 'off' },
  spacing: { ...createDesignMemory().spacing, enforce: 'off' },
  radius: { ...createDesignMemory().radius, enforce: 'off' }
}

function solid(color: SceneNode['fills'][number]['color']): SceneNode['fills'] {
  return [{ type: 'SOLID', visible: true, opacity: 1, color }]
}

/** A document whose design memory allows one blue; `card` decides whether Card leaves it. */
function documentWithCard(card: 'allowed' | 'off'): SceneGraph {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  graph.createNode('RECTANGLE', page.id, {
    name: 'Legacy',
    fills: solid(RED),
    width: 20,
    height: 20
  })
  graph.createNode('RECTANGLE', page.id, {
    name: 'Card',
    fills: solid(card === 'allowed' ? BLUE : RED),
    width: 20,
    height: 20
  })
  writeDesignMemory(graph, allowOnlyBlue)
  return graph
}

/** The id of the layer named Card, so a test changes the same layer the base copy had. */
function cardId(graph: SceneGraph): string {
  const card = [...graph.getAllNodes()].find((node) => node.name === 'Card')
  if (!card) throw new Error('The test document has no Card')
  return card.id
}

function config(overrides: Partial<CheckConfig> = {}): CheckConfig {
  return {
    ...structuredClone(defaultCheckConfig),
    checks: { responsive: false, tokens: false, designMemory: true },
    ...overrides
  }
}

/** Writes `graph` as `dir/other.fig`, for use as the base copy of `dir/design.fig`. */
async function saveAt(graph: SceneGraph, dir: string, name: string): Promise<string> {
  await mkdir(dir, { recursive: true })
  const path = join(dir, name)
  await writeDocumentFile(graph, path)
  return path
}

describe('pairdraw check — what the render tool may answer', () => {
  const warning = (severity: string) => ({
    widths: [
      {
        width: 375,
        height: 812,
        base64: '',
        warnings: [
          { kind: 'sibling-overlap', severity, node_id: 'b', node_name: 'B', message: 'B overlaps A' }
        ]
      }
    ]
  })

  test('an overlap severity the tool reports becomes a warning, never a parse failure', () => {
    for (const severity of ['critical', 'major', 'minor']) {
      const result = readResponsiveResult(warning(severity))
      expect(result?.widths[0].warnings[0].severity).toBe('warning')
    }
    expect(readResponsiveResult(warning('info'))?.widths[0].warnings[0].severity).toBe('info')
  })

  test('an answer that is not the tool contract is refused instead of guessed', () => {
    expect(readResponsiveResult({ widths: 'not an array' })).toBeNull()
  })
})

describe('pairdraw check — design memory and the base revision', () => {
  test('without a base every finding is new and fails at the error level', async () => {
    const path = await saveAt(
      documentWithCard('off'),
      await mkdtemp(join(tmpdir(), 'pairdraw-check-run-')),
      'design.fig'
    )

    const run = await runCheck({ files: [path], config: config() })

    const memory = run.report.files[0].designMemory
    expect(memory?.missing).toBe(false)
    expect(memory?.violations).toHaveLength(2)
    expect(memory?.newCount).toBe(2)
    expect(run.report.exitCode).toBe(1)
  })

  test('a finding the base revision already had is reported but does not fail', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pairdraw-check-base-'))
    process.chdir(root)
    try {
      const graph = documentWithCard('allowed')
      await saveAt(graph, 'base', 'design.fig')
      graph.updateNode(cardId(graph), { fills: solid(RED) })
      await saveAt(graph, '.', 'design.fig')

      const run = await runCheck({ files: ['design.fig'], config: config(), baseDir: 'base' })

      const memory = run.report.files[0].designMemory
      expect(memory?.newCount).toBe(1)
      expect(memory?.preexistingCount).toBe(1)
      expect(
        memory?.violations
          .filter((violation) => violation.new)
          .map((violation) => violation.nodeName)
      ).toEqual(['Card'])
      expect(run.report.exitCode).toBe(1)
      // The verdict counts what this change introduced, not the older finding beside it.
      expect(run.report.totals.errors).toBe(1)
      expect(run.report.totals.newViolations).toBe(1)
    } finally {
      process.chdir(WORKSPACE)
    }
  })

  test('a file with every check off is skipped, not checked', async () => {
    const path = await saveAt(
      documentWithCard('off'),
      await mkdtemp(join(tmpdir(), 'pairdraw-check-skipped-')),
      'design.fig'
    )

    const run = await runCheck({
      files: [path],
      config: config({ checks: { responsive: false, tokens: false, designMemory: false } })
    })

    expect(run.report.files[0].status).toBe('skipped')
    expect(run.report.totals.checked).toBe(0)
    expect(run.report.exitCode).toBe(0)
  })

  test('the same two copies with the head fixed pass, and failOn never always passes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pairdraw-check-fixed-'))
    process.chdir(root)
    try {
      const graph = documentWithCard('off')
      await saveAt(graph, 'base', 'design.fig')
      graph.updateNode(cardId(graph), { fills: solid(BLUE) })
      await saveAt(graph, '.', 'design.fig')

      const fixed = await runCheck({ files: ['design.fig'], config: config(), baseDir: 'base' })
      expect(fixed.report.files[0].designMemory?.newCount).toBe(0)
      expect(fixed.report.files[0].designMemory?.preexistingCount).toBe(1)
      expect(fixed.report.exitCode).toBe(0)
      expect(
        (await runCheck({ files: ['design.fig'], config: config({ failOn: 'never' }) })).report
          .exitCode
      ).toBe(0)
    } finally {
      process.chdir(WORKSPACE)
    }
  })
})

describe('pairdraw check — render names', () => {
  async function pen(path: string, frames: { name: string; fill: string }[]): Promise<string> {
    await mkdir(join(path, '..'), { recursive: true })
    await Bun.write(
      path,
      JSON.stringify({
        version: '2.14',
        children: frames.map((frame, index) => ({
          id: `frame-${index}`,
          type: 'frame',
          name: frame.name,
          x: index * 120,
          y: 0,
          width: 100,
          height: 100,
          fill: frame.fill
        }))
      })
    )
    return path
  }

  const renders = (run: Awaited<ReturnType<typeof runCheck>>) =>
    run.report.files[0].responsive.map((frame) => frame.renders[0].file)

  test('two frames of the same name keep one render each', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-check-dupe-'))
    const path = await pen(join(dir, 'designs', 'dupe.pen'), [
      { name: 'Screen', fill: '#FF0000' },
      { name: 'Screen', fill: '#00FF00' }
    ])

    const run = await runCheck({
      files: [path],
      config: config({
        checks: { responsive: true, tokens: false, designMemory: false },
        responsive: { ...defaultCheckConfig.responsive, widths: [375] }
      })
    })

    expect(renders(run)).toEqual([
      'renders/dupe-pen/screen__screen__375.png',
      'renders/dupe-pen/screen__screen__375-2.png'
    ])
    expect(run.renders.size).toBe(2)
  })

  test('two documents of the same name keep their own render folder', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-check-samename-'))
    const first = await pen(join(dir, 'a', 'home.pen'), [{ name: 'Screen', fill: '#FF0000' }])
    const second = await pen(join(dir, 'b', 'home.pen'), [{ name: 'Screen', fill: '#00FF00' }])

    const run = await runCheck({
      files: [first, second],
      config: config({
        checks: { responsive: true, tokens: false, designMemory: false },
        responsive: { ...defaultCheckConfig.responsive, widths: [375] }
      })
    })

    const folders = [run.report.files[0], run.report.files[1]].map(
      (file) => file.responsive[0].renders[0].file.split('/')[1]
    )
    expect(folders).toEqual(['home-pen', 'home-pen-2'])
    expect(run.renders.size).toBe(2)
  })
})

describe('pairdraw check — tokens and renders', () => {
  test('token drift fails the run and names the token', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-check-tokens-'))
    const stylesheet = join(dir, 'globals.css')
    await Bun.write(stylesheet, ':root { --color-merk-blauw: #FF0000; }\n')

    const run = await runCheck({
      files: [join(FIXTURES, 'pen-variables.pen')],
      config: config({
        checks: { responsive: false, tokens: true, designMemory: false },
        tokens: { source: stylesheet }
      })
    })

    const tokens = run.report.files[0].tokens
    expect(tokens.checked).toBe(true)
    expect(tokens.check?.drift[0]?.variable).toBe('merk-blauw')
    expect(run.report.exitCode).toBe(1)
  })

  test('a document with no variables skips the token check instead of drifting', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-check-novars-'))
    const stylesheet = join(dir, 'globals.css')
    const document = join(dir, 'plain.pen')
    await Bun.write(stylesheet, ':root { --brand: #FF0000; }\n')
    await Bun.write(
      document,
      JSON.stringify({
        version: '2.21',
        children: [{ id: 'plain', type: 'rectangle', width: 10, height: 10 }]
      })
    )

    const run = await runCheck({
      files: [document],
      config: config({
        checks: { responsive: false, tokens: true, designMemory: false },
        tokens: { source: stylesheet }
      })
    })

    expect(run.report.files[0].tokens.skipped).toBe('no variables')
    expect(run.report.exitCode).toBe(0)
  })

  test('a render is written as a PNG the report points at, never as bytes in the JSON', async () => {
    const out = await mkdtemp(join(tmpdir(), 'pairdraw-check-report-'))
    const run = await runCheck({
      files: [join(FIXTURES, 'pencil_simple.pen')],
      config: config({
        checks: { responsive: true, tokens: false, designMemory: false },
        responsive: { ...defaultCheckConfig.responsive, widths: [375] }
      })
    })

    await writeReport(out, run)

    const frame = run.report.files[0].responsive[0]
    expect(frame.renders[0]?.file).toBe(
      'renders/pencil-simple-pen/step-2-frame__step-2-frame__375.png'
    )
    const bytes = await readFile(join(out, frame.renders[0].file))
    expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
    expect((await stat(join(out, frame.renders[0].file))).size).toBeGreaterThan(1000)

    const json = await readFile(join(out, 'report.json'), 'utf8')
    expect(json).not.toContain('"png"')
    expect(json).not.toContain('base64')
    expect(JSON.parse(json).files[0].responsive[0].renders[0].file).toBe(frame.renders[0].file)

    const markdown = await readFile(join(out, 'report.md'), 'utf8')
    expect(markdown.startsWith('<!-- pairdraw-check -->')).toBe(true)
    expect(markdown).toContain('pencil_simple.pen')
    expect(markdown).toContain('375 px')
  })

  test('images are embedded only when a hosted base is given', async () => {
    const run = await runCheck({
      files: [join(FIXTURES, 'pencil_simple.pen')],
      config: config({
        checks: { responsive: true, tokens: false, designMemory: false },
        responsive: { ...defaultCheckConfig.responsive, widths: [375] }
      })
    })

    expect(reportMarkdown(run)).not.toContain('![')
    expect(reportMarkdown(run, { imageBase: 'https://example.test/pr-1' })).toContain(
      '![375px](https://example.test/pr-1/renders/pencil-simple-pen/step-2-frame__step-2-frame__375.png)'
    )
  })
})

describe('pairdraw check — a file that cannot be read', () => {
  test('is an error, never a pass', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pairdraw-check-broken-'))
    const path = join(dir, 'broken.pen')
    await Bun.write(path, 'not a document')

    const run = await runCheck({ files: [path], config: config() })

    expect(run.report.files[0].status).toBe('error')
    expect(run.report.exitCode).toBe(2)
    expect(JSON.stringify(reportJSON(run))).toContain('error')
  })
})

describe('pairdraw check — the report folder', () => {
  test('holds one PNG per width and no other file tree', async () => {
    const out = await mkdtemp(join(tmpdir(), 'pairdraw-check-tree-'))
    const run = await runCheck({
      files: [join(FIXTURES, 'pencil_simple.pen')],
      config: config({
        checks: { responsive: true, tokens: false, designMemory: false },
        responsive: { ...defaultCheckConfig.responsive, widths: [375, 768] }
      })
    })
    await writeReport(out, run)

    expect((await readdir(join(out, 'renders'))).length).toBe(1)
    const folder = join(out, 'renders', 'pencil-simple-pen')
    expect((await readdir(folder)).sort()).toEqual([
      'step-2-frame__step-2-frame__375.png',
      'step-2-frame__step-2-frame__768.png'
    ])
  })
})
