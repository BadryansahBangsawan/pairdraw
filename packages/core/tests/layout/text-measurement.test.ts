import { afterEach, describe, expect, test } from 'bun:test'

import { SceneGraph } from '@pairdraw/scene-graph'

import {
  estimateTextSize,
  getTextMeasurer,
  installTextMeasurer,
  measureTextForLayout,
  setTextMeasurer,
  type TextMeasurer
} from '#core/layout/text-measurement'

const measurer =
  (width: number): TextMeasurer =>
  () => ({ width, height: 10 })

describe('installTextMeasurer', () => {
  afterEach(() => setTextMeasurer(null))

  test('falls back to the most recent measurer still installed', () => {
    const first = measurer(1)
    const second = measurer(2)
    const uninstallFirst = installTextMeasurer(first)
    const uninstallSecond = installTextMeasurer(second)
    expect(getTextMeasurer()).toBe(second)

    uninstallSecond()
    expect(getTextMeasurer()).toBe(first)
    uninstallFirst()
    expect(getTextMeasurer()).toBeNull()
  })

  test('uninstalling an earlier measurer keeps the current one', () => {
    const first = measurer(1)
    const second = measurer(2)
    const uninstallFirst = installTextMeasurer(first)
    const uninstallSecond = installTextMeasurer(second)
    uninstallFirst()
    expect(getTextMeasurer()).toBe(second)
    uninstallSecond()
    expect(getTextMeasurer()).toBeNull()
  })
})

describe('measureTextForLayout', () => {
  afterEach(() => setTextMeasurer(null))

  const graph = new SceneGraph()
  const node = graph.createNode('TEXT', graph.getPages()[0].id, { text: 'Label', fontSize: 14 })

  test('uses the installed measurer', () => {
    setTextMeasurer(measurer(42))
    expect(measureTextForLayout(node, 100)).toEqual({ width: 42, height: 10 })
  })

  test('estimates without a measurer', () => {
    expect(measureTextForLayout(node, 100)).toEqual(estimateTextSize(node, 100))
  })

  test('keeps a text with characters at its size while its fonts are not prepared', () => {
    // The measurer answers null until the fonts are in; the text then keeps the size it has.
    setTextMeasurer(() => null)
    expect(measureTextForLayout(node, 100)).toEqual({ width: node.width, height: node.height })
  })

  test('estimates an empty text, which needs no fonts beyond the default', () => {
    const empty = graph.createNode('TEXT', graph.getPages()[0].id, { text: '', fontSize: 14 })
    setTextMeasurer(() => null)
    expect(measureTextForLayout(empty, 100)).toEqual(estimateTextSize(empty, 100))
  })
})
