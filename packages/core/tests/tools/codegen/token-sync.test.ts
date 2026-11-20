import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'
import { readTokenSources } from '@pairdraw/scene-graph/token-sources'

import {
  defaultTokenImportOptions,
  importTokensIntoGraph,
  planTokenImport,
  planTokenSync,
  readCSSDesignTokens,
  syncTokensIntoGraph,
  type TokenDrift
} from '#core/io/formats/design-tokens'
import { syncTokens, tokenDrift } from '#core/tools/codegen/token-sync'

const CSS = ':root { --brand: #ff0000; --gap: 8px; }\n'

interface DriftResult {
  in_sync: boolean
  total: number
  drift: TokenDrift[]
}

function documentFrom(css: string) {
  const graph = new SceneGraph()
  const bundle = readCSSDesignTokens(graph, css)
  const plan = planTokenImport(graph, bundle, defaultTokenImportOptions(graph, bundle))
  importTokensIntoGraph(graph, graph.getPages()[0].id, plan)
  return new FigmaAPI(graph)
}

const drift = async (figma: FigmaAPI, css: string, path = 'src/app.css') =>
  (await tokenDrift.execute(figma, { files: [{ path, text: css }] })) as DriftResult

describe('token_drift', () => {
  test('reports a document in sync with its stylesheet', async () => {
    expect(await drift(documentFrom(CSS), CSS)).toMatchObject({ in_sync: true, total: 0 })
  })

  test('reports values that differ from the stylesheet without changing the document', async () => {
    const figma = documentFrom(CSS)
    const result = await drift(figma, CSS.replace('8px', '12px'))
    expect(result.in_sync).toBe(false)
    expect(result.drift).toEqual([
      expect.objectContaining({ variable: 'gap', code: '12', canvas: '8' })
    ])
    expect(await drift(figma, CSS)).toMatchObject({ in_sync: true })
  })

  test('judges which side changed against the link the document recorded', async () => {
    const graph = new SceneGraph()
    const bundles = [readCSSDesignTokens(graph, CSS)]
    const link = { id: 'app', kind: 'css' as const, name: 'app.css', path: 'src/app.css' }
    syncTokensIntoGraph(graph, link, bundles, planTokenSync(graph, bundles).resolve())
    const gap = [...graph.variables.values()].find((variable) => variable.name === 'gap')
    if (!gap) throw new Error('No gap')
    for (const modeId of Object.keys(gap.valuesByMode)) gap.valuesByMode[modeId] = 4
    const result = await drift(new FigmaAPI(graph), CSS)
    expect(result.drift).toEqual([expect.objectContaining({ kind: 'canvas', variable: 'gap' })])
  })

  test('reads DTCG token files', async () => {
    const figma = documentFrom(CSS)
    const tokens = JSON.stringify({ radius: { $type: 'number', $value: 4 } })
    const result = await drift(figma, tokens, 'tokens/Tokens.tokens.json')
    expect(result.drift.map((entry) => entry.kind)).toContain('added')
  })
})

interface SyncResult {
  applied: number
  left: TokenDrift[]
}

const sync = async (figma: FigmaAPI, css: string, conflicts?: 'skip' | 'code' | 'canvas') =>
  (await syncTokens.execute(figma, {
    files: [{ path: 'src/app.css', text: css }],
    ...(conflicts ? { conflicts } : {})
  })) as SyncResult

describe('sync_tokens', () => {
  test('brings code in, records the link, and leaves canvas edits for review by default', async () => {
    const figma = new FigmaAPI(new SceneGraph())
    expect((await sync(figma, CSS)).applied).toBe(2)
    expect(readTokenSources(figma.graph)).toEqual([
      expect.objectContaining({ kind: 'css', name: 'app.css' })
    ])

    const gap = [...figma.graph.variables.values()].find((variable) => variable.name === 'gap')
    if (!gap) throw new Error('No gap')
    for (const modeId of Object.keys(gap.valuesByMode)) gap.valuesByMode[modeId] = 4
    const changed = CSS.replace('8px', '12px').replace('#ff0000', '#00ff00')

    const kept = await sync(figma, changed)
    expect(kept.applied).toBe(1)
    expect(kept.left).toEqual([expect.objectContaining({ kind: 'conflict', variable: 'gap' })])
    expect(Object.values(gap.valuesByMode)).toEqual([4])

    expect((await sync(figma, changed, 'code')).applied).toBe(1)
    expect(Object.values(gap.valuesByMode)).toEqual([12])
    expect(await drift(figma, changed)).toMatchObject({ in_sync: true })
  })
})

describe('links by path', () => {
  test('two stylesheets with the same name in different folders are two links', async () => {
    const { syncTokenFiles } = await import('#core/io/formats/design-tokens')
    const graph = new SceneGraph()
    syncTokenFiles(graph, [{ path: 'app.css', text: ':root { --web: #ff0000; }' }], {
      path: 'web/app.css'
    })
    syncTokenFiles(graph, [{ path: 'app.css', text: ':root { --admin: #00ff00; }' }], {
      path: 'admin/app.css'
    })
    expect(readTokenSources(graph).map((source) => source.path)).toEqual([
      'web/app.css',
      'admin/app.css'
    ])
  })
})

describe('token_drift layer findings', () => {
  test('lists layers that use a raw value a token holds, when asked', async () => {
    const figma = documentFrom(CSS)
    const card = figma.graph.createNode('FRAME', figma.currentPageId, {
      name: 'Card',
      fills: [{ type: 'SOLID', visible: true, opacity: 1, color: { r: 1, g: 0, b: 0, a: 1 } }]
    })
    const result = (await tokenDrift.execute(figma, {
      files: [{ path: 'src/app.css', text: CSS }],
      include_layers: true
    })) as DriftResult & { layers: Array<{ nodeId: string; rule: string }> }
    expect(result.layers).toEqual([
      expect.objectContaining({ nodeId: card.id, rule: 'no-hardcoded-colors' })
    ])
    expect(await drift(figma, CSS)).not.toHaveProperty('layers')
  })
})
