import { beforeAll, describe, expect, test } from 'bun:test'

import { expectDefined } from '#core-tests/helpers/assert'

import type { ShapedText } from '@pairdraw/fig/node-change'
import { SceneGraph, type SceneNode } from '@pairdraw/scene-graph'
import { pixelLength } from '@pairdraw/scene-graph/text'

import { withFigExportRuntime } from '#core/canvas/text/shape'
import { getCanvasKit } from '#core/canvaskit'
import { fontManager } from '#core/text/font/manager'

async function shape(props: Partial<SceneNode>): Promise<ShapedText> {
  const graph = new SceneGraph()
  const node = graph.createNode('TEXT', graph.getPages()[0].id, {
    fontFamily: 'Inter',
    fontSize: 16,
    width: 200,
    height: 100,
    textAutoResize: 'NONE',
    ...props
  })
  const shaped = await withFigExportRuntime(graph, await getCanvasKit(), async (runtime) =>
    runtime.shapeText(node)
  )
  return expectDefined(shaped, 'shaped text')
}

describe('text truncation', () => {
  beforeAll(async () => {
    const inter = expectDefined(
      await fontManager.fetchBundledFont('/InterVariable.ttf'),
      'bundled Inter font'
    )
    await fontManager.markLoaded('Inter', 'Regular', inter)
  })

  test('a truncating box keeps the lines its height holds and ends the last with an ellipsis', async () => {
    const shaped = await shape({
      text: 'one\ntwo\nthree\nfour\nfive',
      height: 40,
      lineHeight: pixelLength(20),
      textAutoResize: 'TRUNCATE'
    })
    expect(shaped.baselines).toHaveLength(2)
  })

  test('wraps then truncates at the box height', async () => {
    const shaped = await shape({
      text: 'one two three four five six seven eight nine ten eleven twelve',
      fontFamily: 'Inter',
      fontSize: 20,
      width: 260,
      height: 60,
      textAutoResize: 'TRUNCATE'
    })
    expect(shaped.baselines).toHaveLength(2)
  })

  test('maxLines still caps an overflowing box that is taller than its lines', async () => {
    const shaped = await shape({
      text: 'one\ntwo\nthree',
      height: 100,
      lineHeight: pixelLength(20),
      textAutoResize: 'TRUNCATE',
      maxLines: 1
    })
    expect(shaped.baselines).toHaveLength(1)
  })
})
