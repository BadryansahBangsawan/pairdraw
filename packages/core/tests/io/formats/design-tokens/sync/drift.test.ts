import { describe, expect, test } from 'bun:test'

import { SceneGraph, type Variable } from '@pairdraw/scene-graph'
import { readTokenSources } from '@pairdraw/scene-graph/token-sources'

import {
  defaultTokenImportOptions,
  importTokensIntoGraph,
  planTokenImport,
  planTokenSync,
  readCSSDesignTokens,
  readTokenSourceFiles,
  syncTokenFiles,
  tokenSnapshot,
  trackTokenDrift,
  type TokenDrift
} from '#core/io/formats/design-tokens'

const BASE = `
  :root {
    --brand: #ff0000;
    --accent: var(--brand);
    --space: 1rem;
  }
  .dark {
    --brand: #880000;
  }
`

function linked(css = BASE) {
  const graph = new SceneGraph()
  const bundle = readCSSDesignTokens(graph, css)
  const plan = planTokenImport(graph, bundle, defaultTokenImportOptions(graph, bundle))
  importTokensIntoGraph(graph, graph.getPages()[0].id, plan)
  return { graph, snapshot: tokenSnapshot(graph, [readCSSDesignTokens(graph, css)]) }
}

function variableNamed(graph: SceneGraph, name: string): Variable {
  const found = [...graph.variables.values()].find((variable) => variable.name === name)
  if (!found) throw new Error(`No variable ${name}`)
  return found
}

function modeNamed(graph: SceneGraph, name: string): string {
  for (const collection of graph.variableCollections.values()) {
    const mode = collection.modes.find((entry) => entry.name === name)
    if (mode) return mode.modeId
  }
  throw new Error(`No mode ${name}`)
}

function editOnCanvas(
  graph: SceneGraph,
  name: string,
  mode: string,
  value: Variable['valuesByMode'][string]
) {
  variableNamed(graph, name).valuesByMode[modeNamed(graph, mode)] = value
}

function brief(drift: readonly TokenDrift[]) {
  return drift.map(({ kind, variable, mode }) => [kind, variable, mode])
}

const RED = { r: 1, g: 0, b: 0, a: 1 }
const BLUE = { r: 0, g: 0, b: 1, a: 1 }

describe('drift between linked code and the canvas', () => {
  test('nothing drifts right after a sync', () => {
    const { graph, snapshot } = linked()
    expect(planTokenSync(graph, [readCSSDesignTokens(graph, BASE)], snapshot).drift).toEqual([])
  })

  test('a value changed in code is a code change, and applying it updates the variable', () => {
    const { graph, snapshot } = linked()
    const css = BASE.replace('--brand: #ff0000', '--brand: #00ff00')
    const sync = planTokenSync(graph, [readCSSDesignTokens(graph, css)], snapshot)
    expect(sync.drift).toEqual([
      expect.objectContaining({
        kind: 'code',
        variable: 'brand',
        mode: 'Default',
        code: '#00FF00',
        canvas: '#FF0000'
      })
    ])
    importTokensIntoGraph(graph, graph.getPages()[0].id, sync.resolve().plans[0])
    expect(variableNamed(graph, 'brand').valuesByMode[modeNamed(graph, 'Default')]).toMatchObject({
      g: 1
    })
  })

  test('a value changed only on the canvas is kept unless code is chosen', () => {
    const { graph, snapshot } = linked()
    editOnCanvas(graph, 'brand', 'Default', BLUE)
    const sync = planTokenSync(graph, [readCSSDesignTokens(graph, BASE)], snapshot)
    expect(brief(sync.drift)).toEqual([['canvas', 'brand', 'Default']])

    importTokensIntoGraph(graph, graph.getPages()[0].id, sync.resolve().plans[0])
    expect(variableNamed(graph, 'brand').valuesByMode[modeNamed(graph, 'Default')]).toEqual(BLUE)

    importTokensIntoGraph(graph, graph.getPages()[0].id, sync.resolve(() => 'code').plans[0])
    expect(variableNamed(graph, 'brand').valuesByMode[modeNamed(graph, 'Default')]).toMatchObject(
      RED
    )
  })

  test('different changes on both sides conflict, and the canvas wins until code is chosen', () => {
    const { graph, snapshot } = linked()
    editOnCanvas(graph, 'brand', 'Default', BLUE)
    const css = BASE.replace('--brand: #ff0000', '--brand: #00ff00')
    const sync = planTokenSync(graph, [readCSSDesignTokens(graph, css)], snapshot)
    expect(sync.drift).toEqual([
      expect.objectContaining({
        kind: 'conflict',
        variable: 'brand',
        code: '#00FF00',
        canvas: '#0000FF'
      })
    ])
    importTokensIntoGraph(graph, graph.getPages()[0].id, sync.resolve().plans[0])
    expect(variableNamed(graph, 'brand').valuesByMode[modeNamed(graph, 'Default')]).toEqual(BLUE)
  })

  test('a conflict nobody decides is reported again after the code-only changes come in', () => {
    const { graph, snapshot } = linked()
    editOnCanvas(graph, 'brand', 'Default', BLUE)
    const css = BASE.replace('--brand: #ff0000', '--brand: #00ff00').replace(
      '--brand: #880000',
      '--brand: #440000'
    )
    const bundles = [readCSSDesignTokens(graph, css)]
    const resolution = planTokenSync(graph, bundles, snapshot).resolve()
    expect(brief(resolution.undecided)).toEqual([['conflict', 'brand', 'Default']])
    for (const plan of resolution.plans) importTokensIntoGraph(graph, graph.getPages()[0].id, plan)
    const next = tokenSnapshot(graph, bundles, snapshot, resolution.undecided)
    expect(brief(planTokenSync(graph, bundles, next).drift)).toEqual([
      ['conflict', 'brand', 'Default']
    ])
  })

  test('a token gone from code stays marked until a side is picked for it', () => {
    const { graph, snapshot } = linked()
    const bundles = [readCSSDesignTokens(graph, BASE.replace('--space: 1rem;', ''))]
    const sync = planTokenSync(graph, bundles, snapshot)
    const kept = tokenSnapshot(graph, bundles, snapshot, sync.resolve().undecided)
    expect(brief(planTokenSync(graph, bundles, kept).drift)).toEqual([['missing', 'space', null]])
    const dropped = tokenSnapshot(graph, bundles, snapshot, sync.resolve(() => 'canvas').undecided)
    expect(planTokenSync(graph, bundles, dropped).drift).toEqual([])
  })

  test('the same change on both sides is not drift', () => {
    const { graph, snapshot } = linked()
    editOnCanvas(graph, 'brand', 'Default', BLUE)
    const css = BASE.replace('--brand: #ff0000', '--brand: #0000ff')
    expect(planTokenSync(graph, [readCSSDesignTokens(graph, css)], snapshot).drift).toEqual([])
  })

  test('without a snapshot every difference is a conflict', () => {
    const { graph } = linked()
    const css = BASE.replace('--brand: #ff0000', '--brand: #00ff00')
    expect(brief(planTokenSync(graph, [readCSSDesignTokens(graph, css)]).drift)).toEqual([
      ['conflict', 'brand', 'Default']
    ])
  })

  test('a mode changes on its own', () => {
    const { graph, snapshot } = linked()
    const css = BASE.replace('--brand: #880000', '--brand: #440000')
    expect(brief(planTokenSync(graph, [readCSSDesignTokens(graph, css)], snapshot).drift)).toEqual([
      ['code', 'brand', 'dark']
    ])
  })

  test('the same length or color in another notation is not drift', () => {
    const { graph, snapshot } = linked()
    const css = BASE.replace('--space: 1rem', '--space: 16px').replace(
      '--brand: #ff0000',
      '--brand: rgb(255 0 0)'
    )
    expect(planTokenSync(graph, [readCSSDesignTokens(graph, css)], snapshot).drift).toEqual([])
  })

  test('an alias pointed at another token drifts', () => {
    const { graph, snapshot } = linked(`${BASE} :root { --other: #00ff00; }`)
    const css = `${BASE.replace('--accent: var(--brand)', '--accent: var(--other)')} :root { --other: #00ff00; }`
    // `.dark` inherits the alias from `:root`, so both modes change.
    expect(planTokenSync(graph, [readCSSDesignTokens(graph, css)], snapshot).drift).toEqual(
      ['Default', 'dark'].map((mode) =>
        expect.objectContaining({
          kind: 'code',
          variable: 'accent',
          mode,
          code: '{other}',
          canvas: '{brand}'
        })
      )
    )
  })

  test('a token new in code is added; one gone from code is marked and kept', () => {
    const { graph, snapshot } = linked()
    const css = BASE.replace('--space: 1rem;', '--gap: 8px;')
    const sync = planTokenSync(graph, [readCSSDesignTokens(graph, css)], snapshot)
    expect(brief(sync.drift)).toEqual([
      ['added', 'gap', null],
      ['missing', 'space', null]
    ])
    importTokensIntoGraph(graph, graph.getPages()[0].id, sync.resolve().plans[0])
    expect(variableNamed(graph, 'gap').valuesByMode[modeNamed(graph, 'Default')]).toBe(8)
    expect(variableNamed(graph, 'space')).toBeDefined()
  })
})

describe('review findings', () => {
  test('a variable deleted on the canvas goes to review and stays deleted unless code is chosen', () => {
    const { graph, snapshot } = linked()
    graph.removeVariable(variableNamed(graph, 'space').id)
    const bundles = [readCSSDesignTokens(graph, BASE)]
    const sync = planTokenSync(graph, bundles, snapshot)
    expect(brief(sync.drift)).toEqual([['deleted', 'space', null]])

    const kept = sync.resolve()
    expect(kept.applied).toBe(0)
    for (const plan of kept.plans) importTokensIntoGraph(graph, graph.getPages()[0].id, plan)
    expect([...graph.variables.values()].some((variable) => variable.name === 'space')).toBe(false)
    const next = tokenSnapshot(graph, bundles, snapshot, kept.undecided)
    expect(brief(planTokenSync(graph, bundles, next).drift)).toEqual([['deleted', 'space', null]])

    const restored = planTokenSync(graph, bundles, next).resolve(() => 'code')
    for (const plan of restored.plans) importTokensIntoGraph(graph, graph.getPages()[0].id, plan)
    expect(variableNamed(graph, 'space').valuesByMode).toBeDefined()
  })

  test('light and dark values split across two stylesheets are in code right after a sync', () => {
    const graph = new SceneGraph()
    const files = [
      { path: 'theme.css', text: ':root { --primary: #ff0000; }' },
      { path: 'dark.css', text: '.dark { --primary: #880000; }' }
    ]
    syncTokenFiles(graph, files, { path: 'styles' })
    expect(syncTokenFiles(graph, files, { path: 'styles' }).left).toEqual([])
    const base = readTokenSources(graph).at(0)
    expect(planTokenSync(graph, readTokenSourceFiles(graph, files).bundles, base).drift).toEqual([])
  })

  test('only values a sync writes count as applied', () => {
    const { graph, snapshot } = linked()
    editOnCanvas(graph, 'brand', 'Default', BLUE)
    const sync = planTokenSync(graph, [readCSSDesignTokens(graph, BASE)], snapshot)
    expect(sync.resolve(() => 'canvas').applied).toBe(0)
    expect(sync.resolve(() => 'code').applied).toBe(1)
  })
})

describe('tracking drift while values change', () => {
  test('sees each edit without planning the code again', () => {
    const { graph, snapshot } = linked()
    const drift = trackTokenDrift(graph, [readCSSDesignTokens(graph, BASE)], snapshot)
    expect(drift()).toEqual([])
    editOnCanvas(graph, 'brand', 'Default', BLUE)
    expect(brief(drift())).toEqual([['canvas', 'brand', 'Default']])
    editOnCanvas(graph, 'brand', 'Default', RED)
    expect(drift()).toEqual([])
  })
})
