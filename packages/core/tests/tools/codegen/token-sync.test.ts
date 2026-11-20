import { describe, expect, test } from 'bun:test'

import { FigmaAPI } from '@pairdraw/core/figma-api'
import { SceneGraph } from '@pairdraw/scene-graph'

import {
  defaultTokenImportOptions,
  importTokensIntoGraph,
  planTokenImport,
  planTokenSync,
  readCSSDesignTokens,
  syncTokensIntoGraph,
  type TokenDrift
} from '#core/io/formats/design-tokens'
import { tokenDrift } from '#core/tools/codegen/token-sync'

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
